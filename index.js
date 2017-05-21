
let mod = {};
module.exports = mod;

mod.dependencies = ['navigation'];
mod.install = function(){
    context.requiresMemory = false;
    context.memoryPartitions = ['objects', 'volatile', 'rooms', 'hostiles', 'flags', 'creeps'];

    context.defaultValues({
        USERNAME: 'unknown',
        LOG_VISUAL_BODY: true,
        CRITICAL_TYPES: ['miner', 'hauler', 'upgrader', 'warrior', 'melee', 'ranger', 'healer'],
        SAY_PUBLIC: false,
        CONTROLLER_SIGN: false,
        CONTROLLER_SIGN_MESSAGE: ''
    });

    context.logScopes = {
        military: {severity: 'verbose'},
        CreepAction: {severity: 'verbose'}
    };

    context.inject(global, 'extension.global');
    context.load('extension.misc').extend();
    context.inject(Flag, 'extension.flag');
    context.inject(Room, 'extension.room');
    context.inject(Creep, 'extension.creep');
    context.load('main');
};
