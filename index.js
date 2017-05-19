
let mod = {};
module.exports = mod;

mod.dependencies = ['navigation'];
mod.install = function(){
    context.requiresMemory = false;
    context.memoryPartitions = ['objects', 'volatile', 'rooms', 'hostiles', 'flags', 'creeps'];
    
    context.defaultValue('USERNAME', 'unknown');
    context.defaultValue('LOG_VISUAL_BODY', true);
    context.defaultValue('CRITICAL_TYPES', ['miner', 'hauler', 'upgrader', 'warrior', 'melee', 'ranger', 'healer']);
    context.defaultValue('SAY_PUBLIC', false);
    context.defaultValue('CONTROLLER_SIGN', false);
    context.defaultValue('CONTROLLER_SIGN_MESSAGE', '');

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
