
let mod = {};
module.exports = mod;

Flag.prototype = Object.create(Flag.prototype, {
    memory: {
        get: function () {
            return global.partition['flags'].getObject(this.name);
        },
        set: function (value) {
            global.partition['flags'].setObject(this.name, value);
        }
    }
});

// recreate objects with new prototype
_.forEach(Game.flags, flag => {
    Game.flags[flag.name] = new Flag(flag.name, flag.color, flag.secondaryColor, flag.pos.roomName, flag.pos.x, flag.pos.y);
});

Flag.prototype.memorySet = function(name, value){
    global.partition['flags'].set(data => {
        let m = data[this.name] || {};
        m[name] = value;
        data[this.name] = m;
    });
};
Flag.prototype.memoryDelete = function(name){
    global.partition['flags'].set(data => {
        let m = data[this.name] || {};
        delete m[name];
        data[this.name] = m;
    });
};

Object.defineProperty(Flag.prototype, 'cloaking', {
    configurable: true,
    get: function() {
        return global.partition['volatile'].getObject(this.name).cloaking || 0;
    },
    set: function(value) {
        let mem = global.partition['volatile'].getObject(this.name);
        mem.cloaking = value;
        global.partition['volatile'].setObject(this.name, mem);
    }
});

function flush(){
    // occurs when a flag is found (each tick)
    // param: flag
    Flag.found = new LiteEvent();
    // TODO: Add found event for each primary color (less iteration for each subscriber)

    // occurs when a flag memory if found for which no flag exists (before memory removal)
    // param: flagName
    Flag.removed = new LiteEvent();
}

function analyze(){
    const found = flag => {
        if( flag.cloaking != null && flag.cloaking > 0 ) flag.cloaking--;
        else {
            Flag.found.trigger(flag);
        }
    };
    _.forEach(Game.flags, found);
    const findStaleFlags = (entry, flagName) => {
        if(Game.flags[flagName] == null) {
            Flag.removed.trigger(flagName);
        }
    };
    _.forEach(global.partition['flags'].data, findStaleFlags);
}

function execute(){
    Flag.found.release();
    mod.staleFlags = Flag.removed.release();
}

function cleanup(){
    const clearMemory = flagName => {
        if( global.partition['flags'].hasKey(flagName) ){
            global.partition['flags'].set(data => {
                delete data[flagName];
            });
        }
        if( global.partition['volatile'].hasKey(flagName) ){
            global.partition['volatile'].set(data => {
                delete data[flagName];
            });
        }
    };
    mod.staleFlags.forEach(clearMemory);
}

context.flush.on(flush);
context.analyze.on(analyze);
context.execute.on(execute);
context.cleanup.on(cleanup);
