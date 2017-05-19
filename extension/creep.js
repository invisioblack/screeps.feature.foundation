
// TODO: Implement Creep.spawningStarted event
// TODO: clear memory on cleanup: mod.staleCreeps & mod.staleHostiles

let feature = context;
const CRITICAL_TYPES = context.settings.CRITICAL_TYPES;
const SAY_PUBLIC = context.settings.SAY_PUBLIC;
const CONTROLLER_SIGN = context.settings.CONTROLLER_SIGN;
const CONTROLLER_SIGN_MESSAGE = context.settings.CONTROLLER_SIGN_MESSAGE;
const USERNAME = context.settings.USERNAME;

const PART_THREAT = {
    'move': { common: 0, boosted: 0 },
    'work': { common: 1, boosted: 3 },
    'carry': { common: 0, boosted: 0 },
    'attack': { common: 2, boosted: 5 },
    'ranged_attack': { common: 2, boosted: 5 },
    'heal': { common: 8, boosted: 20 },
    'claim': { common: 1, boosted: 3 },
    'tough': { common: 1, boosted: 3 },
    tower: 30
};

let mod = {};
module.exports = mod;

Creep.prototype = Object.create(Creep.prototype, {
    memory: {
        get: function () {
            return global.partition['creeps'].getObject(this.name);
        },
        set: function (value) {
            global.partition['creeps'].setObject(this.name, value);
        }
    },     
    volatile: {
        get: function () {
            return global.partition['volatile'].getObject(this.name);
        },
        set: function (value) {
            global.partition['volatile'].setObject(this.name, value);
        }
    }
});

// recreate objects with new prototype
_.forEach(Game.creeps, creep => {
    Game.creeps[creep.name] = new Creep(creep.id);
});

Creep.prototype.memorySet = function(name, value){
    global.partition['creeps'].set(data => {
        let m = data[this.name] || {};
        m[name] = value;
        data[this.name] = m;
    });
};
Creep.prototype.memoryDelete = function(name){
    global.partition['creeps'].set(data => {
        let m = data[this.name] || {};
        delete m[name];
        data[this.name] = m;
    });
};
Creep.prototype.volatileSet = function(name, value){
    global.partition['volatile'].set(data => {
        let m = data[this.name] || {};
        m[name] = value;
        data[this.name] = m;
    });
};
Creep.prototype.volatileDelete = function(name){
    global.partition['volatile'].set(data => {
        let m = data[this.name] || {};
        delete m[name];
        data[this.name] = m;
    });
};

/*
global.state.creepRunOk = function(){
    if( global.state._creepRunOkTick !== Game.time ){
        global.state._creepRunOk = global.state.bucketLevel > (global.isBadNode ? 0.8 : 0.5);
        global.state._creepRunOkTick = Game.time;
    }
    return global.state._creepRunOk;
};

Creep.prototype.run = function(behaviour){
    if( !this.spawning ){
        if( global.state.creepRunOk() || CRITICAL_TYPES.includes(this.memory.type)){                
            global.log(`Running ${this.name}...`, {
                scope: 'CreepAction', 
                severity: 'verbose'
            });
            if(!behaviour && this.memory && this.memory.type) {
                behaviour = Creep.behaviour[this.memory.type] || Creep.behaviour.generic;
            }
            if( behaviour ) {
                try{
                    behaviour.run(this);
                }
                catch(e){
                    global.log(`Unexpected error in behaviour.run!`, {
                        scope: 'CreepAction', 
                        severity: 'error'
                    }, e);
                }
            }
            if( this.flee ) {
                this.fleeMove();
                this.say('💫', SAY_PUBLIC);
            }
        }
    }
};
*/


// moveRange: how near should the creep approach?
// workRange: range at wich the creep may calm down (ignore blocking) and interact with the target (may be higher than moveRange)
// range: current distance (optional)
Creep.prototype.drive = function( targetPos, moveRange = 1, workRange = 1, range) {
    // cancel
    if( this.fatigue > 0 || targetPos == null || !this.hasActiveBodyparts(MOVE)) 
        return;
    if( range == null ) range = this.pos.getRangeTo(targetPos);
    if( range != null && moveRange != null && range <= moveRange) 
        return;

    // condition
    let state;
    const lastPos = this.volatile.lastPos;
    const mustMove = range > workRange;
    const didMove = (lastPos && (lastPos.x !== this.pos.x || lastPos.y !== this.pos.y || lastPos.roomName !== this.pos.roomName));
    if( this.volatile.moveMode === undefined || didMove === true ){
        state = 'moved';
        if( didMove === true ) this.room.recordMove(this);
    }
    else if ( this.volatile.moveMode === 'auto' || mustMove === false ){
        state = 'honk';
        if( mustMove ) this.honk();
    }
    else {
        state = 'evade';
        this.honkEvade();
        this.volatile.delete('path');
    }
    // get path
    let path = this.volatile.path;
    if( mustMove === true && (path == null || path.length < (didMove ? 2 : 1)) ){
        // requires new path
        path = PathFinder.find(this.pos, targetPos, state !== 'evade');
        if( state === 'evade' && path != null && path.length > 6 )
            path = path.substr(0,5);
    } else if( didMove === true && this.memory.path != null ){
        // use old path
        path = path.substr(1);
    }
    this.volatileSet('path', path);

    // move
    let moveResult = null;
    if( path != null && path.length > 0 ) {
        moveResult = this.move(path.charAt(0));
    }

    // postprocessing
    if( moveResult === null ){
        // did not try to move. No Path.
        moveResult = ERR_NO_PATH;
        if( mustMove === true ) {
            // delete this.memory.targetId;
            this.say('NO PATH!');
        }
        this.leaveBorder();
    } else if( moveResult === OK ) {
        // move intent registered
        if( state === 'moved' || mustMove === false ) this.volatileSet('moveMode', 'auto');
        else this.volatileSet('moveMode', 'evade');
        this.volatileSet('lastPos', {
            x: this.pos.x, 
            y: this.pos.y, 
            roomName: this.pos.roomName
        });
    } else {
        // unexpected error
        log(`Movement Error for ${this.name}`, {
            roomName: this.pos.roomName, 
            severity: 'error',
            scope: 'PathFinding'
        }, moveResult);
        this.leaveBorder();
    }

    return moveResult;
};

Creep.prototype.honk = function(){
    this.say('⛔', SAY_PUBLIC);
};
Creep.prototype.honkEvade = function(){
    this.say('🔀', SAY_PUBLIC);
};
Creep.prototype.leaveBorder = function() {
    // if on border move away
    // for emergency case, Path not found
    if( this.pos.y < 1 || this.pos.x < 1 || this.pos.y > 48 || this.pos.x > 48 ){
        let path = PathFinder.find(this.pos, new RoomPosition(25, 25, this.pos.roomName), false);
        if( path != null && path.length > 0 ) {
            let result = this.move(path.charAt(0));
            this.volatile.delete('path');
            return result;
        }
        return ERR_NO_PATH;
    }
    return ERR_INVALID_TARGET;
};
Creep.prototype.fleeMove = function() {
    const drop = (val,key) => { 
        if(val > 0 ) this.drop(key); 
    };
    _.forEach(this.carry, drop);

    if( this.fatigue > 0 || this.room.hostiles.length === 0 ) 
        return;

    let fleePath = null;
    if( this.volatile.fleePath == null || 
        this.volatile.fleePath.length === 0 || 
        this.volatile.fleePath[0].x !== this.pos.x || 
        this.volatile.fleePath[0].y !== this.pos.y || 
        this.volatile.fleePath[0].roomName !== this.pos.roomName ) {

        let goals = _.map(this.room.hostiles, hostile => {
            return { 
                pos: hostile.pos, 
                range: 5 
            };
        });

        let ret = PathFinder.search(
            this.pos, goals, {
                flee: true,
                plainCost: 2,
                swampCost: 10,
                maxOps: 500,
                maxRooms: 2,

                roomCallback: function(roomName) {
                    let room = Game.rooms[roomName];
                    if (!room) return;
                    return room.currentCostMatrix;
                }
            }
        );

        fleePath = ret.path;
    }
    else fleePath = this.memory.fleePath;

    if( fleePath != null && fleePath.length > 0 ){
        let nextPos = fleePath.shift();

        if( fleePath.length === 0 ) this.volatileDelete('fleePath');
        else this.volatileSet('fleePath', fleePath);
        this.volatileDelete('path');

        let dir = this.pos.getDirectionTo(new RoomPosition(nextPos.x, nextPos.y, nextPos.roomName));
        return this.move(dir);
    }
};
Creep.prototype.idleMove = function( ) {
    if( this.fatigue > 0 || this.leaveBorder() === OK ) 
        return;

    // check if on road/structure
    let here = this.room.lookForAt(LOOK_STRUCTURES, this.pos);
    if( here && here.length > 0 ) {

        let idlePath = null;
        if( this.volatile.idlePath == null || 
            this.volatile.idlePath.length === 0 || 
            this.volatile.idlePath[0].x !== this.pos.x || 
            this.volatile.idlePath[0].y !== this.pos.y || 
            this.volatile.idlePath[0].roomName !== this.pos.roomName ) {

            let goals = this.room.exitsAsGoals.concat(this.room.structures.asGoals);
            let ret = PathFinder.search(
                this.pos, 
                goals, 
                {
                    flee: true,
                    plainCost: 2,
                    swampCost: 10,
                    maxOps: 350,
                    maxRooms: 1,

                    roomCallback: function(roomName) {
                        let room = Game.rooms[roomName];
                        if (!room) return;
                        return room.currentCostMatrix;
                    }
                }
            );
            idlePath = ret.path;
        } else idlePath = this.memory.idlePath;

        if( idlePath != null && idlePath.length > 0 ){
            let nextPos = idlePath.shift();

            if( idlePath.length === 0 ) this.volatile.delete('idlePath');
            else this.volatileSet('idlePath', idlePath);
            this.volatileDelete('path');

            let dir = this.pos.getDirectionTo(new RoomPosition(nextPos.x, nextPos.y, nextPos.roomName));
            return this.move(dir);
        }
    }
};

Creep.prototype.repairNearby = function( ) {
    // if it has energy and a work part
    if(this.carry.energy > 0 && this.hasActiveBodyparts(WORK)) {
        let nearby = this.pos.findInRange(this.room.structures.driveByRepairable, 3);
        if( nearby != null && nearby.length !== 0 ) this.repair(nearby[0]);
        else {
            // build construction Site
            nearby = this.pos.findInRange(this.room.constructionSites, 3);
            if( nearby != null && nearby.length !== 0 ) this.build(nearby[0]);
        }
    }
};
Creep.prototype.controllerSign = function() {
    if(CONTROLLER_SIGN){
        let ctrl = this.room.controller;
        if( ctrl != null && ctrl.my === true && (ctrl.sign == null || ctrl.sign.username != USERNAME || ctrl.sign.text != CONTROLLER_SIGN_MESSAGE) )
            this.signController(ctrl, CONTROLLER_SIGN_MESSAGE);
    }
};

Creep.prototype.hasActiveBodyparts = function(partTypes){
    if(Array.isArray(partTypes))
        return (this.body.some((part) => ( partTypes.includes(part.type) && part.hits > 0 )));
    else return (this.body.some((part) => ( part.type == partTypes && part.hits > 0 )));
};

function bodyThreat(body) {
    let threat = 0;
    let evaluatePart = part => {
        threat += PART_THREAT[part.type ? part.type : part][part.boost ? 'boosted' : 'common'];
    };
    if( body ) body.forEach(evaluatePart);
    return threat;
}

function bodyCosts(body){
    let costs = 0;
    if( body ){
        body.forEach(function(part){
            costs += BODYPART_COST[part];
        });
    }
    return costs;
}
// params: {fixedBody, multiBody, minThreat, maxWeight, maxMulti}
function multi(room, params) {
    let multiBody = params.multiBody;
    if( !multiBody || multiBody.length === 0 ) return 0;
    let fixedCosts = bodyCosts(params.fixedBody);
    let multiCosts = bodyCosts(params.multiBody);
    let maxThreatMulti;
    if( params && params.minThreat ){
        let fixedThreat = bodyThreat(params.fixedBody);
        let multiThreat = bodyThreat(params.multiBody);
        maxThreatMulti = 0;
        let iThreat = fixedThreat;
        while(iThreat < params.minThreat){
            maxThreatMulti += 1;
            iThreat += multiThreat;
        };
    } else maxThreatMulti = Infinity;
    if(multiCosts === 0) return 0; // prevent divide-by-zero
    let maxParts = Math.floor((50 - params.fixedBody.length) / params.multiBody.length);
    let maxEnergy = params.currentEnergy ? room.energyAvailable : room.energyCapacityAvailable;
    let maxAffordable = Math.floor((maxEnergy - fixedCosts) / multiCosts);
    let maxWeightMulti = (params && params.maxWeight) ? Math.floor((params.maxWeight-fixedCosts)/multiCosts) : Infinity;
    let maxMulti = (params && params.maxMulti) ? params.maxMulti : Infinity;
    return _.min([maxParts, maxAffordable, maxThreatMulti, maxWeightMulti, maxMulti]);
}
function partsComparator(a, b) {
    let partsOrder = [TOUGH, CLAIM, WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, MOVE];
    let indexOfA = partsOrder.indexOf(a);
    let indexOfB = partsOrder.indexOf(b);
    return indexOfA - indexOfB;
}

// params: {fixedBody, multiBody, minThreat, maxWeight, maxMulti}
Creep.compileBody = function (room, params, sort = true) {
    let parts = [];
    let multi = multi(room, params);
    for (let iMulti = 0; iMulti < multi; iMulti++) {
        parts = parts.concat(params.multiBody);
    }
    for (let iPart = 0; iPart < params.fixedBody.length; iPart++) {
        parts[parts.length] = params.fixedBody[iPart];
    }
    if( sort ) parts.sort(partsComparator);            
    if( parts.includes(HEAL) ) {
        let index = parts.indexOf(HEAL);
        parts.splice(index, 1);
        parts.push(HEAL);
    }
    return parts;
};

Object.defineProperties(Creep.prototype, {
    'flee': {
        configurable: true,
        get: function() {
            let flee = false;
            if( this.volatile.flee === true ){
                // release when restored
                if( this.hits === this.hitsMax )
                    this.volatileSet('flee', false);
                else flee = true;
            } else {
                // set when low
                let hostiles = this.room.hostiles;
                if( hostiles != null && hostiles.length !== 0 && (this.hits/this.hitsMax) < 0.35 ){
                    this.volatileSet('flee', true);
                    flee = true;
                }
            }
            return flee;
        },
        set: function(value) {
            this.volatileSet('flee', value);
        }
    },
    'sum': {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._sum) || this._sumSet != Game.time ) {
                this._sumSet = Game.time;
                this._sum = _.sum(this.carry);
            }
            return this._sum;
        }
    }, 
    'threat': {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._threat) ) {
                this._threat = Creep.bodyThreat(this.body);
            }
            return this._threat;
        }
    },
    'bodyCount': {
        configurable: true, 
        get: function() {
            if( _.isUndefined(this._bodyCount) ) {
                // TODO: save to mem
                this._bodyCount = _.countBy(this.body, part => part.boost ? `${part.type}+${part.boost}` : part.type);
            }
            return this._bodyCount;
        }
    },
    'bodyDisplay': {
        configurable: true, 
        get: function() {
            if( _.isUndefined(this._bodyDisplay) ) {
                this._bodyDisplay = `<style type="text/css">.body{margin: 5px -10px 10px -10px; background-color: #222; padding: 1px 10px 5px 10px;width:200px;overflow:auto;font-family:Arial, sans-serif;white-space:normal;-webkit-font-smoothing:antialiased;line-height: 1.42857143;box-sizing:border-box;}.body label.body-header { display: block; margin-bottom: 5px;font-weight:bold;color:#666;font-size:12px;line-height:1.42857143;}.body label.body-header .pull-right { font-weight: normal; float:right;}.body .bodypart { position: relative; display:inline-block; width: 13px; height: 13px; border-radius: 100%; box-shadow: 0 1px 1px rgba(0, 0, 0, 0.6); margin-right: 5px; overflow: hidden;box-sizing:border-box;}.body .bodypart.type-move { background-color: #a9b7c6;}.body .bodypart.type-work { background-color: #ffe56d;}.body .bodypart.type-attack { background-color: #f93842;} .body .bodypart.type-ranged_attack { background-color: #5d80b2;}.body .bodypart.type-heal { background-color: #65fd62;}.body .bodypart.type-tough { background-color: #fff;}.body .bodypart.type-claim { background-color: #b99cfb;}.body .bodypart.type-carry { background-color: #777;}.body .bodypart.boost { border: 2px solid white; width: 17px; height: 17px; margin-right: 3px; margin-left: -2px; top: 2px;}</style><div class="body" onclick="window.location.href='https://screeps.com/a/#!/room/${this.pos.roomName}'"><label class="body-header">Body<div class="pull-right">${this.body.length} parts</div></label>`;
                const addPart = part => {
                    this._bodyDisplay += `<div class="bodypart ng-scope type-${part.type}${part.boost ? ' boost':''}" title="type: ${part.type}${part.boost ? ', boost: ' + part.boost:''}"></div>`;
                };
                this.body.forEach(part => addPart(part));
                this._bodyDisplay += '</div>';
            }
            return this._bodyDisplay;
        }
    }
});

Creep.analyzeHostile = function(creep){
    let hostileData = global.partition['hostiles'].getObject(creep.id, false);
    if( hostileData != null && creep.pos.roomName != hostileData.latestPos.roomName ){        
        // update latestPos
        hostileData.latestPos = {
            roomName: creep.pos.roomName, 
            x: creep.pos.x, 
            y: creep.pos.y, 
        };
        global.partition['hostiles'].setObject(creep.id, hostileData);
        return;
    } 

    let category;
    if( creep.owner.username === 'Invader' ){
        category = 'Invader';
        Creep.newInvader.trigger(creep);
        log(`New invader ${creep.id}!`, {
            scope: 'military', 
            severity: 'information', 
            roomName: creep.pos.roomName
        }, body);
    }
    else if( creep.owner.username === 'Source Keeper' ) {
        category = 'Source Keeper';
        Creep.newSourceKeeper.trigger(creep);
        log(`New Source Keeper ${creep.id}!`, {
            scope: 'military', 
            severity: 'verbose', 
            roomName: creep.pos.roomName
        }, body);
    }
    else if(global.isPlayerWhitelisted !== undefined && global.isPlayerWhitelisted(creep.owner.username) === true ){
        category = 'Whitelisted';
        Creep.newWhitelisted.trigger(creep);
        log(`New whitelisted intruder ${creep.id} from ${creep.owner.username}!`, {
            scope: 'military', 
            severity: 'information', 
            roomName: creep.pos.roomName
        }, body);
    }
    else if( !creep.room.my && !creep.room.myReservation ) {
        category = 'EnemyOnNeutralGround';
        // TODO: Filter for intruders on rooms marked for claiming/mining etc...
        Creep.newEnemyOnNeutralGround.trigger(creep);
        log(`Foreign creep ${creep.id} from "${creep.owner.username}"`, {
            scope: 'military', 
            severity: 'informtion', 
            roomName: creep.pos.roomName
        }, body);
    } else {
        category = 'Enemy';
        Creep.newEnemy.trigger(creep);
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
        if(global.alert !== undefined) global.alert(message);
        else Game.notify(message);
    }

    // register invader
    if( hostileData != null ){        
        // update latestPos
        hostileData.latestPos = {
            roomName: creep.pos.roomName, 
            x: creep.pos.x, 
            y: creep.pos.y, 
        };
        hostileData.state = 'open';
        hostileData.category = category;
    }
    else {
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
            id: creep.id, 
            category
        };    
    }
    global.partition['hostiles'].setObject(creep.id, hostileData);
};

function flush(){
    Creep.spawningStarted = new LiteEvent();
    Creep.spawningCompleted = new LiteEvent();
    Creep.own = new LiteEvent();
    Creep.predictedRenewal = new LiteEvent();
    Creep.died = new LiteEvent();

    Creep.newInvader = new LiteEvent();
    Creep.knownInvader = new LiteEvent();  
    Creep.goneInvader = new LiteEvent();
    Creep.newSourceKeeper = new LiteEvent();
    Creep.knownSourceKeeper = new LiteEvent();
    Creep.goneSourceKeeper = new LiteEvent();
    Creep.newEnemy = new LiteEvent();
    Creep.knownEnemy = new LiteEvent();
    Creep.goneEnemy = new LiteEvent();
    Creep.newEnemyOnNeutralGround = new LiteEvent();
    Creep.knownEnemyOnNeutralGround= new LiteEvent();
    Creep.goneEnemyOnNeutralGround= new LiteEvent();
    Creep.newWhitelisted = new LiteEvent();
    Creep.knownWhitelisted = new LiteEvent();
    Creep.goneWhitelisted = new LiteEvent();
}

function creepDied(name) {
    log(`${name} died`, {
        severity: 'verbose', 
        scope: 'census'
    });
    Creep.died.trigger(name);
}
function creepSpawning(name) {
    // count spawning time
    global.partition['volatile'].set(data => {
        let m = data[name] || {};
        let spawningTime = m['spawningTime'] || 0;
        m['spawningTime'] = ++spawningTime;
        data[this.name] = m;
    });
}
function spawningCompleted(creep){
    if( creep.memory.predictedRenewal === undefined ) creep.memorySet('predictedRenewal', creep.volatile.spawningTime + 50);
    creep.memorySet('spawningTime', creep.volatile.spawningTime);
    creep.volatileDelete('spawningTime');
    Creep.spawningCompleted.trigger(creep);
}
function predictedRenewal(creep){
    log(`${creep.name} will die soon`, {
        roomName: creep.pos.roomName, 
        severity: 'verbose', 
        scope: 'census'
    });
    Creep.predictedRenewal.trigger(creep);
}
function analyzeCreepMemory(memory, name){
    let creep = Game.creeps[name];

    if ( !creep ) {
        creepDied(name);
        return;
    }
    if( creep.my ){
        if( creep.spawning ) creepSpawning(name);
        else {
            if( creep.ticksToLive === ( creep.bodyCount.claim !== undefined ? 499 : 1499 ) ) spawningCompleted(creep);
            else if( creep.ticksToLive === ( creep.memory.predictedRenewal ? creep.memory.predictedRenewal : creep.memory.spawningTime)) predictedRenewal(creep);
        }
        Creep.own.trigger(creep);
    }
}
const analyzeHostileMemoryHandler = {
    gone: {
        'Invader': Creep.goneInvader.trigger,
        'Source Keeper': Creep.goneSourceKeeper.trigger,
        'Whitelisted': Creep.goneWhitelisted.trigger,
        'EnemyOnNeutralGround': Creep.goneEnemyOnNeutralGround.trigger,
        'Enemy': Creep.goneEnemy.trigger
    }, 
    known: {
        'Invader': Creep.knownInvader.trigger,
        'Source Keeper': Creep.knownSourceKeeper.trigger,
        'Whitelisted': Creep.knownWhitelisted.trigger,
        'EnemyOnNeutralGround': Creep.knownEnemyOnNeutralGround.trigger,
        'Enemy': Creep.knownEnemy.trigger
    }
}
function analyzeHostileMemory(memory, id){
    let creep = Game.getObjectById(id);
    if(memory.latestPos === undefined){            
        log(`Corrupt hostile entry ${id}`, {
            severity: 'error',
            scope: 'Memory'
        }, memory);
    }
    const room = memory.latestPos === undefined ? null : Game.rooms[memory.latestPos.roomName];
    if( (memory.maxRetention && memory.maxRetention <= Game.time) || (creep == null && room != null) ){
        const handler = analyzeHostileMemoryHandler.gone[memory.category];
        if( handler != null ) handler(id);
    } else {
        const handler = analyzeHostileMemoryHandler.known[memory.category];
        if( handler != null ) handler(creep);
    }
}

function analyze(){
    _.forEach(global.partition['creeps'].data, analyzeCreepMemory);
    _.forEach(global.partition['hostiles'].data, analyzeHostileMemory);   
}

function execute(){
    Creep.spawningStarted.release();
    Creep.spawningCompleted.release();
    Creep.own.release();
    Creep.predictedRenewal.release();
    mod.staleCreeps = Creep.died.release();
    Creep.newInvader.release();
    Creep.knownInvader.release();
    const goneInvader = Creep.goneInvader.release();
    Creep.newSourceKeeper.release();
    Creep.knownSourceKeeper.release();
    const goneSourceKeeper = Creep.goneSourceKeeper.release();
    Creep.newEnemy.release();
    Creep.knownEnemy.release();
    const goneEnemy = Creep.goneEnemy.release();
    Creep.newEnemyOnNeutralGround.release();
    Creep.knownEnemyOnNeutralGround.release();
    const goneEnemyOnNeutralGround = Creep.goneEnemyOnNeutralGround.release();
    Creep.newWhitelisted.release();
    Creep.knownWhitelisted.release();
    const goneWhitelisted = Creep.goneWhitelisted.release();
    
    mod.staleHostiles = [];
    if( goneInvader != null && goneInvader.length !== 0 ) Array.prototype.push.apply(mod.staleHostiles, goneInvader);
    if( goneSourceKeeper != null && goneSourceKeeper.length !== 0 ) Array.prototype.push.apply(mod.staleHostiles, goneSourceKeeper);
    if( goneEnemy != null && goneEnemy.length !== 0 ) Array.prototype.push.apply(mod.staleHostiles, goneEnemy);
    if( goneEnemyOnNeutralGround != null && goneEnemyOnNeutralGround.length !== 0 ) Array.prototype.push.apply(mod.staleHostiles, goneEnemyOnNeutralGround);
    if( goneWhitelisted != null && goneWhitelisted.length !== 0 ) Array.prototype.push.apply(mod.staleHostiles, goneWhitelisted);    
}

function cleanup(){
    // TODO: clear memory: mod.staleCreeps & mod.staleHostiles
}

context.flush.on(flush);
context.analyze.on(analyze);
context.execute.on(execute);
context.cleanup.on(cleanup);
