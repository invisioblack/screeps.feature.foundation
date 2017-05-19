
let feature = context;

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
    }
});

_.forEach(Game.creeps, creep => {
    Game.creeps[creep.name] = new Creep(creep.id);
});
