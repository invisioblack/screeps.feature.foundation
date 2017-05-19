
const STRUCTURE_REANALYSYS = 10010;
let feature = context;
const USERNAME = context.settings.USERNAME;

let mod = {};
module.exports = mod;

Room.prototype = Object.create(Room.prototype, {
    memory: {
        get: function () {
            return global.partition['rooms'].getObject(this.name);
        },
        set: function (value) {
            global.partition['rooms'].setObject(this.name, value);
        }
    }
});

_.forEach(Game.rooms, room => {
    Game.rooms[room.name] = new Room(room.name);
});

function Container(room){
    this.room = room;

    function analyze(){
        let td = room.memory;
        td.container = [];
        let containers = room.structures.all.filter(
            structure => structure.structureType == STRUCTURE_CONTAINER
        );
        let add = (cont) => {
            let pos = cont.pos;
            let minerals = room.minerals;
            let source = cont.pos.findInRange(room.sources, 2);
            let mineral = cont.pos.findInRange(minerals, 2);
            let demolish = FlagDir.filterCustom(flag => flag.color === COLOR_ORANGE && flag.roomName === pos.roomName && flag.x === pos.x && flag.y === pos.y)
            td.container.push({
                id: cont.id,
                source: (source.length > 0),
                controller: ( cont.pos.getRangeTo(room.controller) < 4 ),
                mineral: (mineral.length > 0),
                demolish: demolish.length > 0
            });
            let assignContainer = s => {
                let m = s.memory;
                if( m.container !== cont.id){
                    m.container = cont.id;
                    s.memory = m;
                }
            }
            source.forEach(assignContainer);
            mineral.forEach(assignContainer);
        };
        containers.forEach(add);
        room.memory = td;

        if( room.terminal !== undefined ) {
            let source = room.terminal.pos.findInRange(room.sources, 2);
            let mineral = room.terminal.pos.findInRange(room.minerals, 2);
            let assignTerminal = s => {
                let m = s.memory;
                if( m.terminal !== room.terminal.id){
                    m.terminal = room.terminal.id;
                    s.memory = m;
                }
            }
            source.forEach(assignTerminal);
            mineral.forEach(assignTerminal);
        }
        if( room.storage !== undefined ) {
            let source = room.storage.pos.findInRange(room.sources, 2);
            let mineral = room.storage.pos.findInRange(room.minerals, 2);
            let assignStorage = s => {
                let m = s.memory;
                if( m.storage !== room.storage.id){
                    m.storage = room.storage.id;
                    s.memory = m;
                }
            }
            source.forEach(assignStorage);
            mineral.forEach(assignStorage);

            if( room.storage.pos.getRangeTo(room.controller) < 4 )
                room.controller.memory.storage = room.storage.id;
        }
    }

    Object.defineProperties(this, {
        'all': {
            configurable: true,
            get: function() {
                if( this.room.memory.container === undefined || this.room.memory.containerReset < Game.time) {
                    analyze();
                    this.this.room.memory.containerReset = Game.time + STRUCTURE_REANALYSYS;
                }
                if( this._container === undefined ){
                    this._container = [];
                    let add = entry => {
                        let cont = Game.getObjectById(entry.id);
                        if( cont != null ) {
                            _.assign(cont, entry);
                            this._container.push(cont);
                        }
                    };
                    _.forEach(this.room.memory.container, add);
                }
                return this._container;
            }
        },
        'controller': {
            configurable: true,
            get: function() {
                if( this._controller === undefined ){
                    if( this.room.my && this.room.controller.memory && this.room.controller.memory.storage ){
                        this._controller = [Game.getObjectById(this.room.controller.memory.storage)];
                        if( !this._controller[0] ) delete this.room.controller.memory.storage;
                    } else {
                        let byType = c => c.controller === true;
                        this._controller = _.filter(this.all, byType);
                    }
                }
                return this._controller;
            }
        },
        'in': {
            configurable: true,
            get: function() {
                if( this._in === undefined ){
                    let byType = c => c.controller === false || c.demolish === true;
                    this._in = _.filter(this.all, byType);
                    // add managed
                    let isFull = c => c.sum >= (c.storeCapacity * (1-MANAGED_CONTAINER_TRIGGER));
                    this._in = this._in.concat(this.managed.filter(isFull));
                }
                return this._in;
            }
        },
        'out': {
            configurable: true,
            get: function() {
                if( this._out === undefined ){
                    let byType = c => c.controller === true && c.demolish === false;
                    this._out = _.filter(this.all, byType);
                    // add managed
                    let isEmpty = c => c.sum <= (c.storeCapacity * MANAGED_CONTAINER_TRIGGER);
                    this._out = this._out.concat(this.managed.filter(isEmpty));
                }
                return this._out;
            }
        },
        'privateers': {
            configurable: true,
            get: function() {
                if( this._privateers === undefined ){
                    let byType = c => (c.source === false && c.demolish === false && c.mineral === false && c.sum < c.storeCapacity);
                    this._privateers = _.filter(this.all, byType);
                }
                return this._privateers;
            }
        },
        'managed': {
            configurable: true,
            get: function() {
                if( this._managed === undefined ){
                    let byType = c => c.source === true && c.controller === true && c.demolish === false;
                    this._managed = _.filter(this.all, byType);
                }
                return this._managed;
            }
        }
    });
};

function Links(room){
    this.room = room;
    
    function analyze(){
        let td = room.memory;
        td.links = [];

        let isLink = structure => structure instanceof StructureLink;
        let links = room.structures.all.filter(isLink);        
        let storageLinks = room.storage ? room.storage.pos.findInRange(links, 2).map(l => l.id) : [];
        
        // for each link add to memory
        let add = (link) => {
            let isControllerLink = ( link.pos.getRangeTo(room.controller) < 4 );
            let isSource = false;
            if( !isControllerLink ) {
                let source = link.pos.findInRange(room.sources, 2);
                let assign = s => {
                    let m = s.memory;
                    if( m.link !== link.id){
                        m.link = link.id;
                        s.memory = m;
                    }
                }
                source.forEach(assign);
                isSource = source.length > 0;
            }
            td.links.push({
                id: link.id,
                storage: storageLinks.includes(link.id),
                controller: isControllerLink,
                source: isSource
            });
        };
        links.forEach(add);
        room.memory = td;
    }

    Object.defineProperties(this, {
        'all': {
            configurable: true,
            get: function() {
                if( this.room.memory.links === undefined || this.room.memory.linkReset < Game.time) {
                    analyze();
                    this.this.room.memory.linkReset = Game.time + STRUCTURE_REANALYSYS;
                }
                if( this._all === undefined ){
                    this._all = [];
                    let add = entry => {
                        let o = Game.getObjectById(entry.id);
                        if( o != null ) {
                            _.assign(o, entry);
                            this._all.push(o);
                        }
                    };
                    _.forEach(this.room.memory.links, add);
                }
                return this._all;
            }
        },
        'controller': {
            configurable: true,
            get: function() {
                if( this._controller === undefined ){
                    let byType = c => c.controller === true;
                    this._controller = this.all.filter(byType);
                }
                return this._controller;
            }
        },
        'storage': {
            configurable: true,
            get: function() {
                if( this._storage === undefined ) {
                    let byType = l => l.storage === true;
                    this._storage = this.all.filter(byType);
                }
                return this._storage;
            }
        },
        'in': {
            configurable: true,
            get: function() {
                if( this._in === undefined ) {
                    let byType = l => l.storage === false && l.controller === false;
                    this._in = _.filter(this.all, byType);
                }
                return this._in;
            }
        },
        'privateers': {
            configurable: true,
            get: function() {
                if( this._privateers === undefined ) {
                    let byType = l => l.storage === false && l.controller === false && l.source === false && l.energy < l.energyCapacity * 0.85;
                    this._privateers = _.filter(this.all, byType);
                }
                return this._privateers;
            }
        }
    });
};

function Structures(room){
    this.room = room;
    this.created = Game.time;
    let that = this;

    Object.defineProperties(this, {
        'all': {
            configurable: true,
            get: function() {
                if( this._all === undefined ){
                    this._all = this.room.find(FIND_STRUCTURES);
                }
                return this._all;
            }
        },
        /*
        'repairable': {
            configurable: true,
            get: function() {
                if( this._repairable === undefined ){
                    let that = this;
                    this._repairable = _.sortBy(
                        that.all.filter(
                            structure => (
                                // is not at 100%
                                structure.hits < structure.hitsMax &&
                                // not owned room or hits below RCL repair limit
                                ( !that.room.my || structure.hits < MAX_REPAIR_LIMIT[that.room.rcl] || structure.hits < (LIMIT_URGENT_REPAIRING + (2*DECAY_AMOUNT[structure.structureType] || 0))) &&
                                // not decayable or below threshold
                                ( !DECAYABLES.includes(structure.structureType) || (structure.hitsMax - structure.hits) > GAP_REPAIR_DECAYABLE ) &&
                                // not pavement art
                                ( that.room.pavementArt.indexOf('x'+structure.pos.x+'y'+structure.pos.y+'x') < 0 ) && 
                                // not flagged for removal
                                ( !FlagDir.list.some(f => f.roomName === structure.pos.roomName && f.color === COLOR_ORANGE && f.x === structure.pos.x && f.y === structure.pos.y) )
                            )
                        ),
                        'hits'
                    );
                }
                return this._repairable;
            }
        },
        'fortifyable': {
            configurable: true,
            get: function() {
                if( this._fortifyableSites === undefined ){
                    let that = this;
                    this._fortifyableSites = _.sortBy(
                        that.all.filter(
                            structure => (
                                that.room.my &&
                                structure.hits < structure.hitsMax &&
                                structure.hits < MAX_FORTIFY_LIMIT[that.room.rcl] &&
                                ( structure.structureType !== STRUCTURE_CONTAINER || structure.hits < MAX_FORTIFY_CONTAINER ) &&
                                ( !DECAYABLES.includes(structure.structureType) || (structure.hitsMax - structure.hits) > GAP_REPAIR_DECAYABLE*3 ) &&
                                ( that.room.pavementArt.indexOf('x'+structure.pos.x+'y'+structure.pos.y+'x') < 0 ) && 
                                ( !FlagDir.list.some(f => f.roomName === structure.pos.roomName && f.color === COLOR_ORANGE && f.x === structure.pos.x && f.y === structure.pos.y) )
                            )
                        ),
                        'hits'
                    );
                }
                return this._fortifyableSites;
            }
        },
        */
        'container' : {
            configurable: true,
            get: function() {
                if( this._container === undefined ){
                    this._container = new Container(this.room);
                }
                return this._container;
            }
        },
        'links' : {
            configurable: true,
            get: function() {
                if( this._links === undefined ){
                    this._links = new Links(this.room);
                }
                return this._links;
            }
        }
    });
    
    this.spawns = [];
    this.towers = [];
    this.fuelable = [];
    this.extensions = [];
    this.feedable = [];
    this.labs = [];
    this.keeperLairs = [];
    this.roads = [];
    this.asGoals = [];

    let typeHandler = {};
    typeHandler[STRUCTURE_SPAWN] = structure => {
        that.spawns.push(structure);
        that.feedable.push(structure);
    };
    typeHandler[STRUCTURE_EXTENSION] = structure => {
        that.extensions.push(structure);
        that.feedable.push(structure);
    };
    typeHandler[STRUCTURE_TOWER] = structure => {
        that.towers.push(structure);
        if( structure.energy < (structure.energyCapacity * 0.82) )
            that.fuelable.push(structure);
    }
    typeHandler[STRUCTURE_LAB] = structure => that.labs.push(structure);
    typeHandler[STRUCTURE_KEEPER_LAIR] = structure => that.keeperLairs.push(structure);
    typeHandler[STRUCTURE_ROAD] = structure => that.roads.push(structure);
    typeHandler[STRUCTURE_EXTRACTOR] = structure => that.extractor = structure;
    typeHandler[STRUCTURE_NUKER] = structure => that.nuker = structure;
    typeHandler[STRUCTURE_OBSERVER] = structure => that.observer = structure;
    // STRUCTURE_WALL
    // STRUCTURE_RAMPART
    // STRUCTURE_PORTAL
    // STRUCTURE_CONTROLLER
    // STRUCTURE_LINK
    // STRUCTURE_STORAGE
    // STRUCTURE_POWER_BANK
    // STRUCTURE_POWER_SPAWN
    // STRUCTURE_TERMINAL
    // STRUCTURE_CONTAINER

    let assign = structure => {
        let handler = typeHandler[structure.structureType];
        if( handler != null ) handler(structure);
        this.asGoals.push({pos: structure.pos, range: 1});
    };
    this.all.forEach(assign);
};

/*
mod.extend = function(){
};
*/
Object.defineProperties(Room.prototype, {
    'volatile': {
        configurable: true,
        get: function() {
            if( global.partition['volatile'] == null || global.partition['volatile'].data == null ) 
                return null;
            return global.partition['volatile'].getObject(this.name);
        },
        set: function(value) {
            global.partition['volatile'].setObject(this.name, value);
        }
    },
    'rcl': {
        configurable: true,
        get: function() {
            if( this._rcl === undefined ){
                this._rcl = this.controller ? this.controller.level : null;
            }
            return this._rcl;
        }
    },
    'structures': {
        configurable: true,
        get: function() {
            if( this._structures === undefined ){
                this._structures = new Structures(this);
            }
            return this._structures;
        }
    },
    'sources': {
        configurable: true,
        get: function() {
            if( this.memory.sources === undefined || this.mode !== MODE_WORLD) {
                this._sources = this.find(FIND_SOURCES);
                let td = this.memory;
                if( this._sources.length > 0 ){
                    td.sources = this._sources.map(s => s.id);
                } else td.sources = [];
                this.memory = td;
            }
            if( this._sources === undefined ){
                this._sources = [];
                let addSource = id => { addById(this._sources, id); };
                this.memory.sources.forEach(addSource);
            }
            return this._sources;
        }
    },
    'droppedResources': {
        configurable: true,
        get: function() {
            if( this._droppedResources === undefined ){
                this._droppedResources = this.find(FIND_DROPPED_RESOURCES);
            }
            return this._droppedResources;
        }
    },
    'sourceAccessibleFields': {
        configurable: true,
        get: function() {
            if( this.memory.sourceAccessibleFields == null ) {
                let sourceAccessibleFields = 0;
                let sources = this.sources;
                let countAccess = source => sourceAccessibleFields += source.accessibleFields;
                _.forEach(sources, countAccess);
                let td = this.memory;
                td.sourceAccessibleFields = sourceAccessibleFields;
                this.memory = td;
            }
            return this.memory.sourceAccessibleFields;
        }
    },
    'sourceEnergyAvailable': {
        configurable: true,
        get: function() {
            if( this._sourceEnergyAvailable === undefined ){
                this._sourceEnergyAvailable = 0;
                let countEnergy = source => (this._sourceEnergyAvailable += source.energy);
                _.forEach(this.sources, countEnergy);
            }
            return this._sourceEnergyAvailable;
        }
    },
    'ticksToNextRegeneration': {
        configurable: true,
        get: function() {
            if( this._ticksToNextRegeneration === undefined ){
                this._ticksToNextRegeneration = _(this.sources).map('ticksToRegeneration').min() || 0;
            }
            return this._ticksToNextRegeneration;
        }
    },
    'relativeEnergyAvailable': {
        configurable: true,
        get: function() {
            if( this._relativeEnergyAvailable === undefined ){
                this._relativeEnergyAvailable = this.energyCapacityAvailable > 0 ? this.energyAvailable / this.energyCapacityAvailable : 0;
            }
            return this._relativeEnergyAvailable;
        }
    },
    'reservedSpawnEnergy': {
        configurable: true,
        get: function() {
            if( this._reservedSpawnEnergy === undefined ) {
                this._reservedSpawnEnergy = 0;
            }
            return this._reservedSpawnEnergy;
        },
        set: function(value) {
            this._reservedSpawnEnergy = value;
        }
    },
    'remainingEnergyAvailable': {
        configurable: true,
        get: function() {
            if( this._remainingEnergyAvailable === undefined ){
                this._remainingEnergyAvailable = this.energyAvailable - this.reservedSpawnEnergy;
            }
            return this._remainingEnergyAvailable;
        }
    },
    'relativeRemainingEnergyAvailable': {
        configurable: true,
        get: function() {
            if( this._relativeRemainingEnergyAvailable === undefined ){
                this._relativeRemainingEnergyAvailable = this.energyCapacityAvailable > 0 ? this.remainingEnergyAvailable / this.energyCapacityAvailable : 0;
            }
            return this._relativeRemainingEnergyAvailable;
        }
    },
    'storedEnergy': {
        configurable: true,
        get: function() {
            if( this._storedEnergy === undefined ){
                this._storedEnergy = (this.storage !== undefined ? this.storage.store.energy : 0) + (this.terminal !== undefined ? this.terminal.store.energy : 0);
            }
            return this._storedEnergy;
        }
    },
    'volatileResource': {
        configurable: true,
        get: function() {
            if( this._volatileResource === undefined ){
                this._volatileResource = _.sum(this.structures.container.in, 'sum');
                this._volatileResource += _.sum(this.droppedResources, 'amount');
            }
            return this._volatileResource;
        }
    },       

    'towerFreeCapacity': {
        configurable: true,
        get: function() {
            if( this._towerFreeCapacity === undefined ) {
                this._towerFreeCapacity = 0;
                let addFreeCapacity = tower => this._towerFreeCapacity += (tower.energyCapacity - tower.energy);
                _.forEach(this.structures.towers, addFreeCapacity);
            }
            return this._towerFreeCapacity;
        }
    },
    'constructionSites': {
        configurable: true,
        get: function() {
            if( this._constructionSites === undefined ) {
                this._constructionSites = this.find(FIND_MY_CONSTRUCTION_SITES);
            }
            return this._constructionSites;
        }
    },
    'exitsAsGoals': {
        configurable: true,
        get: function() {
            if( this._exitsAsGoals === undefined ) {
                this._exitsAsGoals = _.map(this.find(FIND_EXIT), function(o) {
                    return { pos: o, range: 1 };
                });
            }
            return this._exitsAsGoals;
        }
    },

    'creeps': {
        configurable: true,
        get: function() {
            if( this._creeps === undefined ){
                this._creeps = this.find(FIND_MY_CREEPS);
            }
            return this._creeps;
        }
    },
    'allCreeps': {
        configurable: true,
        get: function() {
            if( this._allCreeps === undefined ){
                this._allCreeps = this.find(FIND_CREEPS);
            }
            return this._allCreeps;
        }
    },
    /*
    'hostiles': {
        configurable: true,
        get: function() {
            if( this._hostiles === undefined ){
                let notWhitelisted = (creep) => 
                    !(PLAYER_WHITELIST.some((player) => 
                        player.toLowerCase() === creep.owner.username.toLowerCase()
                    ));
                this._hostiles = this.find(FIND_HOSTILE_CREEPS, { filter : notWhitelisted });
            }
            return this._hostiles;
        }
    },
    */
    'combatCreeps': {
        configurable: true,
        get: function() {
            if( this._combatCreeps === undefined ){
                this._combatCreeps = this.creeps.filter( c => c.data && ['melee','ranger','healer','warrior'].includes(c.data.creepType) );
            }
            return this._combatCreeps;
        }
    },
    'casualties': {
        configurable: true,
        get: function() {
            if( this._casualties === undefined ){
                let isInjured = creep => creep.hits < creep.hitsMax && (creep.towers === undefined || creep.towers.length === 0);
                this._casualties = _.sortBy(_.filter(this.creeps, isInjured), 'hits');
            }
            return this._casualties;
        }
    },
    'situation': {
        configurable: true,
        get: function() {
            if( this._situation === undefined ){
                this._situation = {
                    //noEnergy: this.sourceEnergyAvailable === 0,
                    invasion: this.hostiles.length > 0 && (!this.controller || !this.controller.safeMode)
                }
            }
            return this._situation;
        }
    },
    'conserveForDefense': {
        configurable: true,
        get: function () {
            if( this._conserveForDefense === undefined ){
                this._conserveForDefense = (this.my === true && this.storage !== undefined && this.storage.charge < 0 );
            }
            return this._conserveForDefense;
        }
    },
    'hostileThreatLevel': {
        configurable: true,
        get: function () {
            if ( this._hostileThreatLevel === undefined ) {
                // TODO: add towers when in foreign room
                this._hostileThreatLevel = 0;
                let evaluateBody = creep => {
                    this._hostileThreatLevel += creep.threat;
                };
                this.hostiles.forEach(evaluateBody);
            }
            return this._hostileThreatLevel;
        }
    },
    'defenseLevel': {
        configurable: true,
        get: function () {
            if ( this._defenseLevel === undefined ) {
                this._defenseLevel = {
                    towers: 0,
                    creeps: 0,
                    sum: 0
                }
                let evaluate = creep => {
                    this._defenseLevel.creeps += creep.threat;
                };
                this.combatCreeps.forEach(evaluate);
                this._defenseLevel.towers = this.structures.towers.length;
                this._defenseLevel.sum = this._defenseLevel.creeps + (this._defenseLevel.towers * Creep.partThreat.tower);
            }
            return this._defenseLevel;
        }
    },
    'minerals': {
        configurable:true,
        get: function () {
            if( this.memory.minerals === undefined || this.memory.mineralReset < Game.time ) {                    
                let that = this;
                let toPos = o => {
                    return {
                        x: o.pos.x,
                        y: o.pos.y
                    };
                };
                let isExtractor = structure => structure instanceof StructureExtractor;
                let extractorPos = this.structures.all.filter(isExtractor).map(toPos);
                let hasExtractor = m => _.some(extractorPos, {
                    x: m.pos.x,
                    y: m.pos.y
                });
                this._minerals = this.find(FIND_MINERALS).filter(hasExtractor);
                
                let td = this.memory;
                if( this._minerals.length > 0 ){
                    td.minerals = _.map(that._minerals, 'id');
                } else td.minerals = [];
                this.memory = td;
                
                this.memory.mineralReset = Game.time + STRUCTURE_REANALYSYS;
            }
            if( this._minerals === undefined ){
                this._minerals = [];
                let add = id => { addById(this._minerals, id); };
                this.memory.minerals.forEach(add);
            }
            return this._minerals;
        }
    },
    'mineralType': {
        configurable:true,
        get: function () {
            if( this.memory.mineralType === undefined ) {
                let minerals = this.find(FIND_MINERALS);
                let td = this.memory;
                if( minerals != null && minerals.length > 0 )
                    td.mineralType = minerals[0].mineralType;
                else td.mineralType = '';
                this.memory = td;
            }
            return this.memory.mineralType;
        }
    },
    'my': {
        configurable: true,
        get: function () {
            if( this._my === undefined ) {
                this._my = this.owner === USERNAME;
            }
            return this._my;
        }
    },
    'owner': {
        configurable: true,
        get: function () {
            if( this._owner === undefined ) {
                if( this.controller !== undefined && this.controller.owner !== undefined ) {
                    this._owner = this.controller.owner.username;
                } else {
                    this._owner = null;
                }
            }
            return this._owner;
        },
    },
    'myReservation': {
        configurable: true,
        get: function () {
            if( this._myReservation === undefined ) {
                this._myReservation = this.reserver === global.USERNAME;
            }
            return this._myReservation;
        },
    },
    'reserver': {
        configurable: true,
        get: function () {
            if( this._reservation === undefined ) {
                if (this.controller !== undefined && this.controller.reservation !== undefined) {
                    this._reservation = this.controller.reservation.username;
                } else {
                    this._reservation = null;
                }
            }
            return this._reservation;
        },
    },
    'spawnQueueHigh': {
        configurable: true,
        get: function() {
            let memory = this.volatile;
            if( memory.spawnQueueHigh === undefined ) {
                memory.spawnQueueHigh = [];
                this.volatile = memory;
            }
            return this.volatile.spawnQueueHigh;
        },
        set: function(value) {
            let memory = this.volatile;
            memory.spawnQueueHigh = value;
            this.volatile = memory;
        }
    },
    'spawnQueueMedium': {
        configurable: true,
        get: function() {
            let memory = this.volatile;
            if( memory.spawnQueueMedium === undefined ) {
                memory.spawnQueueMedium = [];
                this.volatile = memory;
            }
            return this.volatile.spawnQueueMedium;
        },
        set: function(value) {
            let memory = this.volatile;
            memory.spawnQueueMedium = value;
            this.volatile = memory;
        }
    },
    'spawnQueueLow': {
        configurable: true,
        get: function() {
            let memory = this.volatile;
            if( memory.spawnQueueLow === undefined ) {
                memory.spawnQueueLow = [];
                this.volatile = memory;
            }
            return this.volatile.spawnQueueLow;
        },
        set: function(value) {
            let memory = this.volatile;
            memory.spawnQueueLow = value;
            this.volatile = memory;
        }
    },
    'collapsed': {
        configurable: true,
        get: function() {
            if( this._collapsed === undefined ) {
                if( !this.my ) {
                    // only if owned
                    this._collapsed = false;
                    return false;
                }
                let memory = this.volatile;
                if( !memory.collapsed ) {
                    memory.collapsed = 0;
                } else {
                    let hasSupporter = this.creeps.some(c => c.memory && ['worker', 'hauler', 'pioneer'].includes(c.memory.creepType));
                    if( hasSupporter ) memory.collapsed = 0;
                    else memory.collapsed++;
                }
                this.volatile = memory;
                this._collapsed = (memory.collapsed > 5);
            }
            return this._collapsed;
        }
    }, 
    'creepTypes': {
        configurable: true,
        get: function () {
            if( this._creepTypes === undefined ) {
                this._creepTypes = _.groupBy(this.creeps, 'memory.creepType');
            }
            return this._creepTypes;
        },
    }
});

Room.prototype.getBestConstructionSiteFor = function(pos, filter = null) {
    let sites;
    if( filter ) sites = this.constructionSites.filter(filter);
    else sites = this.constructionSites;
    if( sites.length === 0 ) return null;

    let siteOrder = [STRUCTURE_EXTENSION,STRUCTURE_LINK,STRUCTURE_TOWER,STRUCTURE_ROAD,STRUCTURE_SPAWN,STRUCTURE_STORAGE,STRUCTURE_TERMINAL,STRUCTURE_CONTAINER,STRUCTURE_EXTRACTOR,STRUCTURE_WALL,STRUCTURE_RAMPART];
    let rangeOrder = site => {
        let order = siteOrder.indexOf(site.structureType); 
        return pos.getRangeTo(site) + ( order < 0 ? 100000 : (order * 100) );
        //if( order < 0 ) return 100000 + pos.getRangeTo(site);
        //return ((order - (site.progress / site.progressTotal)) * 100) + pos.getRangeTo(site);
    };
    return _.min(sites, rangeOrder);
};

Room.prototype.linkDispatcher = function () {
    let filled = l => l.cooldown === 0 && l.energy >= (l.energyCapacity * (l.source ? 0.85 : 0.5));
    let empty = l =>  l.energy < l.energyCapacity * 0.15;
    let filledIn = this.structures.links.in.filter(filled);
    let emptyController = this.structures.links.controller.filter(empty);

    if( filledIn.length > 0 ){
        let emptyStorage = this.structures.links.storage.filter(empty);

        let handleFilledIn = f => { // first fill controller, then storage
            if( emptyController.length > 0 ){
                f.transferEnergy(emptyController[0]);
                emptyController.shift();
            } else if( emptyStorage.length > 0 ){
                f.transferEnergy(emptyStorage[0]);
                emptyStorage.shift();
            }
        }
        filledIn.forEach(handleFilledIn);
    }

    if( emptyController.length > 0 ){ // controller still empty, send from storage
        let filledStorage = this.structures.links.storage.filter(filled);
        let handleFilledStorage = f => {
            if( emptyController.length > 0 ){
                f.transferEnergy(emptyController[0]);
                emptyController.shift();
            }
        }
        filledStorage.forEach(handleFilledStorage);
    }
};
Room.prototype.processInvaders = function(){
    //let that = this;        
    let logNewHostile = creep => {
        let body = feature.settings.LOG_VISUAL_BODY ? creep.bodyDisplay : creep.bodyCount;
        if( creep.owner.username === 'Invader' ) {
            log(`Invader ${creep.id}!`, {
                scope: 'military', 
                severity: 'information', 
                roomName: creep.pos.roomName
            }, body);
        }
        else if( creep.owner.username === 'Source Keeper' ) {
            log(`Source Keeper ${creep.id}!`, {
                scope: 'military', 
                severity: 'verbose', 
                roomName: creep.pos.roomName
            }, body);
        }
        else if(PLAYER_WHITELIST.includes(creep.owner.username)){
            log(`Whitelisted intruder ${creep.id} from ${creep.owner.username}!`, {
                scope: 'military', 
                severity: 'information', 
                roomName: creep.pos.roomName
            }, body);
        }
        else {
            let ignore = null;
            if( DEFENSE_BLACKLIST.includes(creep.pos.roomName) ){
                ignore = 'verbose';
            }
            // if not our room and not our reservation
            else if( !creep.room.my && !creep.room.myReservation ) {
                let validColor = flagEntry => (flagEntry.color == FLAG_COLOR.claim.color);
                let flag = FlagDir.find(validColor, creep.pos, true);
                if( !flag ) ignore = 'information'; // ignore invader
            }
            if( ignore ) {
                log(`Foreign creep ${creep.id} from "${creep.owner.username}"`, {
                    scope: 'military', 
                    severity: ignore, 
                    roomName: creep.pos.roomName
                }, body);
            } else {
                const status = creep.room.my ? "owned" : "reserved";
                let intel = "";
                if( global.lib !== undefined && global.lib.roomIntel !== undefined ){
                    const alliance = global.lib.roomIntel.getUserAlliance(creep.owner.username);
                    if( alliance === false) intel = " (no alliance)";
                    else intel = " (" + alliance + ")";
                }

                log(`Hostile intruder ${creep.id} from "${creep.owner.username}${intel}" in ${status} room ${creep.pos.roomName}`, {
                    scope: 'military', 
                    severity: 'warning', 
                    roomName: creep.pos.roomName
                }, body);

                const message = `Hostile intruder ${creep.id} ${JSON.stringify(creep.bodyCount)} from "${creep.owner.username}${intel}" in ${status} room ${creep.pos.roomName}`;
                Game.notify(message);
                if(global.alert !== undefined) global.alert(message);
            }
        }
    };

    let registerHostile = creep => {
        let hostileData = global.partition['hostiles'].getObject(creep.id, false);
        // if invader unregistered
        if( hostileData == null ){
            hostileData = {
                firstTick: Game.time,
                maxRetention: Game.time + (creep.ticksToLive || 1500),
                owner: creep.owner.username, 
                threat: creep.threat,
                firstRoom: creep.pos.roomName,
                latestPos: {
                    roomName: creep.pos.roomName, 
                    x: creep.pos.x, 
                    y: creep.pos.y, 
                },
                state: 'open',
                id: creep.id
            };
            logNewHostile(creep);
        } else {
            // update latestPos
            hostileData.latestPos = {
                roomName: creep.pos.roomName, 
                x: creep.pos.x, 
                y: creep.pos.y, 
            };
        }
        global.partition['hostiles'].setObject(creep.id, hostileData);
    }
    _.forEach(this.hostiles, registerHostile);
};

mod.requiringEnergy = function(filter){
    if( Room._requiringEnergy === undefined || Room._requiringEnergySet !== Game.time ){
        Room._requiringEnergySet = Game.time;
        let requiresEnergy = r => (
            r.my &&
            r.rcl < 8 &&
            r.storage !== undefined && 
            r.terminal !== undefined &&
            r.terminal.sum < r.terminal.storeCapacity - 50000 &&
            r.storage.store.energy < r.storage.storeCapacity * 0.6 &&
            r.storage.sum < r.storage.storeCapacity * 0.8
        );
        Room._requiringEnergy = _.filter(Game.rooms, requiresEnergy);
    }

    if( filter != null ) return _.filter(Room._requiringEnergy, filter);
    return Room._requiringEnergy;
};
mod.allMine = function(filter){
    if( Room._allMine === undefined || Room._allMineTime != Game.time ){
        Room._allMineTime = Game.time;
        Room._allMine = _.filter(Game.rooms, 'my');
    }
    if( filter ) return _.filter(Room._allMine, filter);
    return Room._allMine;
};
mod.hasHostile = function(roomName) {
    let inRoom = h => h.latestPos != null && h.latestPos.roomName === roomName && h.state === 'open';
    _.some(global.partition['hostiles'].data, inRoom);
};
// find a room to spawn
// params: { targetRoom, minRCL = 0, maxRange = Infinity, minEnergyAvailable = 0, minEnergyCapacity = 0, allowTargetRoom = false, rangeRclRatio = 3, rangeQueueRatio = 51 }
// requiredParams: targetRoom
mod.findSpawnRoom = function(params){
    if( !params || !params.targetRoom ) return null;
    // filter validRooms
    let isValidRoom = room => (
        room.my && 
        (params.minEnergyCapacity === undefined || params.minEnergyCapacity <= room.energyCapacityAvailable) &&
        (params.minEnergyAvailable === undefined || params.minEnergyAvailable <= room.energyAvailable) &&
        (room.name != params.targetRoom || params.allowTargetRoom === true) &&
        (params.minRCL === undefined || room.rcl >= params.minRCL)
    );
    let validRooms = _.filter(Game.rooms, isValidRoom);
    if( validRooms.length == 0 ) return null;
    // select "best"
    // range + roomLevelsUntil8/rangeRclRatio + spawnQueueDuration/rangeQueueRatio
    let queueTime = queue => _.sum(queue, c => (c.parts.length*3));
    let roomTime = room => ((queueTime(room.spawnQueueLow)*0.9) + queueTime(room.spawnQueueMedium) + (queueTime(room.spawnQueueHigh)*1.1) ) / room.structures.spawns.length;
    let evaluation = room => { return routeRange(room.name, params.targetRoom) +
        ( (8-room.rcl) / (params.rangeRclRatio||3) ) + 
        ( roomTime(room) / (params.rangeQueueRatio||51) );
    }
    return _.min(validRooms, evaluation);
};
// find a room for delivery
// params: { fromRoom, allowFromRoom = false, requiresStorage = true, rangeRclRatio = 2, storageScoreRange = 2 }
// requiredParams: fromRoom
mod.findDeliveryRoom = function(params){
    if( !params || !params.fromRoom ) return null;
    let unallowed = params.allowFromRoom === true ? '' : params.fromRoom;
    let requiresStorage = params.requiresStorage || true;
    // filter validRooms
    let isValidRoom = room => room.my && room.name !== unallowed && (!requiresStorage || room.storage);
    let validRooms = _.filter(Game.rooms, isValidRoom);
    if( validRooms.length === 0 ) return null;
    // select "best"
    let storageScoreRange = params.storageScoreRange || 2;
    let rangeRclRatio = params.rangeRclRatio || 2;
    let distance = room => routeRange(params.fromRoom, room.name);
    let rclEval = room => ( room.rcl/rangeRclRatio );
    let storageEval = room => { 
        if( !room.storage ) return 0; // no storge => 0
        if( room.storage.charge <= 0 ) return -1; // below min => -1
        if( room.storage.charge >= 1 ) return storageScoreRange; // above max => storageScoreRange
        return room.storage.charge * storageScoreRange; // between min/max => proportional storageScoreRange
    };
    let evaluation = room => distance(room) + storageEval(room) + rclEval(room);
    return _.min(validRooms, evaluation);
};
mod.getCostMatrix = function(roomName) {
    let room = Game.rooms[roomName];
    if( room == null ) return;
    return room.costMatrix;
};
mod.isMine = function(roomName) {
    let room = Game.rooms[roomName];
    return( room && room.my );
};

mod.validFields = function(roomName, minX, maxX, minY, maxY, checkWalkable = false, where = null) {
    let look;
    if( checkWalkable ) {
        look = Game.rooms[roomName].lookAtArea(minY,minX,maxY,maxX);
    }
    let invalidObject = o => {
        return ((o.type === LOOK_TERRAIN && o.terrain === 'wall') ||
            // o.type == LOOK_CONSTRUCTION_SITES ||
            (o.type === LOOK_STRUCTURES && OBSTACLE_OBJECT_TYPES.includes(o.structure.structureType) ));
    };
    let isWalkable = (posX, posY) => look[posY][posX].filter(invalidObject).length === 0;

    let fields = [];
    for( let x = minX; x <= maxX; x++) {
        for( let y = minY; y <= maxY; y++){
            if( x > 1 && x < 48 && y > 1 && y < 48 ){
                if( !checkWalkable || isWalkable(x,y) ){
                    let p = new RoomPosition(x, y, roomName);
                    if( !where || where(p) )
                        fields.push(p);
                }
            }
        }
    }
    return fields;
};
// args = { spots: [{pos: RoomPosition, range:1}], checkWalkable: false, where: ()=>{}, roomName: abc ) }
mod.fieldsInRange = function(args) {
    let plusRangeX = args.spots.map(spot => spot.pos.x + spot.range);
    let plusRangeY = args.spots.map(spot => spot.pos.y + spot.range);
    let minusRangeX = args.spots.map(spot => spot.pos.x - spot.range);
    let minusRangeY = args.spots.map(spot => spot.pos.y - spot.range);
    let minX = Math.max(...minusRangeX);
    let maxX = Math.min(...plusRangeX);
    let minY = Math.max(...minusRangeY);
    let maxY = Math.min(...plusRangeY);
    return Room.validFields(args.roomName, minX, maxX, minY, maxY, args.checkWalkable, args.where);
};

mod.adjacentRooms = function(roomName, range = 1){
    let parts = roomName.split(/([N,E,S,W])/);
    let dirs = ['N','E','S','W'];
    let toggleDir = q => dirs[ (dirs.indexOf(q)+2) % 4 ];
    let toggleCoord = c => (c*(-1))-1;
    let names = [];
    for( let x = parseInt(parts[2]) - range; x <= parseInt(parts[2]) + range; x++ ){
        for( let y = parseInt(parts[4]) - range; y <= parseInt(parts[4]) + range; y++ ){
            let name = ( x < 0 ? toggleDir(parts[1]) + toggleCoord(x) : parts[1] + x ) + ( y < 0 ? toggleDir(parts[3]) + toggleCoord(y) : parts[3] + y );
            if( name !== roomName ) names.push( name );
        }
    }
    return names;
};

function flush(){
    // param: room
    Room.foundOwned = new LiteEvent();

    // param: room
    Room.foundReserved = new LiteEvent();
    
    // param: room
    Room.foundOther = new LiteEvent();

    // ocurrs when a new invader has been spotted for the first time
    // param: invader creep
    Room.newInvader = new LiteEvent();
    
    // ocurrs every tick since an invader has been spotted until its not in that room anymore (will also occur when no sight until validated its gone)
    // param: invader creep id
    Room.knownInvader = new LiteEvent();
    
    // ocurrs when an invader is not in the same room anymore (or died). will only occur when (or as soon as) there is sight in the room.
    // param: invader creep id
    Room.goneInvader = new LiteEvent();
    
    // ocurrs when a room is considered to have collapsed. Will occur each tick until solved.
    // param: room
    Room.collapsed = new LiteEvent();
}

function analyze(){
    function found(room){
        if(room.my) Room.foundOwned.trigger(room);
        else if(room.myReservation) Room.foundReserved.trigger(room);
        else Room.foundOther.trigger(room);
        room.processInvaders();
    };
    _.forEach(Game.rooms, found);
}

function execute(){
    Room.foundOwned.release();
    Room.foundReserved.release();
    Room.foundOther.release();
    Room.newInvader.release();
    Room.knownInvader.release();
    Room.goneInvader.release();
    Room.collapsed.release();
}

context.flush.on(flush);
context.analyze.on(analyze);
context.execute.on(execute);
