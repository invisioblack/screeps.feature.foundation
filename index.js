
let mod = {};
module.exports = mod;

mod.dependencies = [];
mod.install = function(){
    context.requiresMemory = false;
    context.memoryPartitions = ['objects', 'volatile', 'rooms', 'hostiles', 'flags', 'creeps'];
    
    context.defaultValue('USERNAME', 'unknown');
    context.defaultValue('LOG_VISUAL_BODY', true);

    context.logScopes = {
        military: {severity: 'verbose'}
    };

    context.inject(global, 'extension.global');
    context.load('extension.misc').extend();
    context.inject(Flag, 'extension.flag');
    context.inject(Room, 'extension.room');
    context.inject(Creep, 'extension.creep');
    context.load('main');
};
