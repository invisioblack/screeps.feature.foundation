
function getObject(key){
    if( global.partition['objects'] == null || global.partition['objects'].data == null ) 
        return null;
    return global.partition['objects'].getObject(key);
}
function setObject(key, value){
    global.partition['objects'].setObject(key, value);
    /*
    global.partition['objects'].set(data => {
        data[key] = value;
    });
    */
}

let mod = {};
module.exports = mod;

mod.extend = function(){
    Object.defineProperty(Structure.prototype, 'towers', {
        configurable: true,
        get: function() {
            if(_.isUndefined(this._towers) || this._towersSet != Game.time) {
                this._towersSet = Game.time;
                this._towers = [];
            }
            return this._towers;
        },
        set: function(value) {
            this._towers = value;
        }
    });
    Object.defineProperty(Structure.prototype, 'memory', {
        configurable: true,
        get: function() {
            return getObject(this.id);
        },
        set: function(value) {
            setObject(this.id, value);
        }
    });
    Object.defineProperty(Source.prototype, 'memory', {
        configurable: true,
        get: function() {
            return getObject(this.id);
        },
        set: function(value) {
            setObject(this.id, value);
        }
    });
    Object.defineProperty(Mineral.prototype,'memory', {
        configurable: true,
        get: function() {
            return getObject(this.id);
        },
        set: function(value) {
            setObject(this.id, value);
        }
    });
    Object.defineProperty(RoomPosition.prototype, 'adjacent', {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._adjacent) )  {
                this._adjacent = [];
                for(let x = this.x-1; x < this.x+2; x++){
                    for(let y = this.y-1; y < this.y+2; y++){
                        if( x > 0 && x < 49 && y > 0 && y < 49 ){
                            this._adjacent.push(new RoomPosition(x, y, this.roomName));
                        }
                    }
                }
            }
            return this._adjacent;
        }
    });
    Object.defineProperty(RoomObject.prototype, 'accessibleFields', {
        configurable: true,
        get: function() {
            if ( this.memory && !_.isUndefined(this.memory.accessibleFields) ) {
                return this.memory.accessibleFields;
            } else {
                let fields = this.room.lookForAtArea(LOOK_TERRAIN, this.pos.y-1, this.pos.x-1, this.pos.y+1, this.pos.x+1, true);
                let walls = _.countBy( fields , "terrain" ).wall;
                let accessibleFields = walls === undefined ? 9 : 9-walls;
                if( this.memory ){
                    let m = this.memory;
                    m.accessibleFields = accessibleFields;
                    this.memory = m;
                }
                return accessibleFields;
            }
        }
    });
    Object.defineProperty(Source.prototype, 'container', {
        configurable: true,
        get: function() {
            let that = this;
            /*
            if( _.isUndefined(this.memory.container)) {
                this.room.saveContainers();
            };
            */

            if( _.isUndefined(this._container) ) {
                if( this.memory.storage ) {
                    this._container = Game.getObjectById(this.memory.storage);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.storage;
                        this.memory = m;
                    }
                }
                else if( this.memory.terminal ) {
                    this._container = Game.getObjectById(this.memory.terminal);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.terminal;
                        this.memory = m;
                    }
                }
                else if( this.memory.container ) {
                    this._container = Game.getObjectById(this.memory.container);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.container;
                        this.memory = m;
                    }
                } else this._container = null;
            }
            return this._container;
        }
    });
    Object.defineProperty(Mineral.prototype, 'container', {
        configurable: true,
        get: function() {
            let that = this;
            /*
            if( _.isUndefined(this.memory.container)) {
                this.room.saveContainers();
            };
            */

            if( _.isUndefined(this._container) ) {
                if( this.memory.terminal ) {
                    this._container = Game.getObjectById(this.memory.terminal);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.terminal;
                        this.memory = m;
                    }
                }
                else if( this.memory.storage ) {
                    this._container = Game.getObjectById(this.memory.storage);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.storage;
                        this.memory = m;
                    }
                }
                else if( this.memory.container ) {
                    this._container = Game.getObjectById(this.memory.container);
                    if( !this._container ) {
                        let m = this.memory;
                        delete m.container;
                        this.memory = m;
                    }
                } else this._container = null;
            }
            return this._container;
        }
    });
    Object.defineProperty(Source.prototype, 'link', {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._link) ) {
                if( this.memory.link ) {
                    this._link = Game.getObjectById(this.memory.link);
                    if( !this._link ) {
                        let m = this.memory;
                        delete m.link;
                        this.memory = m;
                    }
                } else this._link = null;
            }
            return this._link;
        }
    });
    Object.defineProperty(StructureStorage.prototype, 'charge', { // fraction indicating charge % relative to constants
       configurable: true,
       get: function() {
            if( _.isUndefined(this._chargeScale) || global.serverOutdated || this._rcl !== this.room.controller.level ) {
                let room = this.room;
                let params = room.behaviour.params;
                this._rcl = room.controller.level;
                this._max = params.MAX_STORAGE_ENERGY[this._rcl];
                this._min = params.MIN_STORAGE_ENERGY[this._rcl];
                this._chargeScale = (this._max === this._min) ? 0 : (1 / (this._max - this._min));
            }
            if( _.isUndefined(this._charge) || this._chargeSet !== Game.time )
            {
                this._chargeSet = Game.time;
                if (this._max === this._min) {
                    if (this.store.energy > max) {
                        this._charge = Infinity;
                    } else {
                        this._charge = -Infinity;
                    }
                }
                this._charge = (this.store.energy - this._min) * this._chargeScale;
            }
            return this._charge;
        }
    });
    Object.defineProperty(StructureStorage.prototype, 'sum', {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._sum) || this._sumSet != Game.time ) {
                this._sumSet = Game.time;
                this._sum = _.sum(this.store);
            }
            return this._sum;
        }
    });
    Object.defineProperty(StructureContainer.prototype, 'sum', {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._sum) || this._sumSet != Game.time ) {
                this._sumSet = Game.time;
                this._sum = _.sum(this.store);
            }
            return this._sum;
        }
    });
    Object.defineProperty(StructureContainer.prototype, 'targetable', {
        configurable: true,
        get: function() {
            if( _.isUndefined(this._targetable) || this._targetableSet != Game.time ) {
                this._targetableSet = Game.time;
                let room = this.room;
                this._targetable = (room.my || room.myReservation || (room.owner === null && room.reserver === null)) && // neutral area
                    (room.my === false || this.source === false || this.controller === false || this.sum < (this.storeCapacity * global.MANAGED_CONTAINER_TRIGGER)); // unmanaged or below min
            }
            return this._targetable;
        }
    });
};
