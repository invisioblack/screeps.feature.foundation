
let mod = {};
module.exports = mod;

mod.dependencies = [];
mod.install = function(){
    context.requiresMemory = false;
    context.memoryPartitions = ['objects', 'volatile', 'rooms', 'hostiles', 'flags'];
    
    context.defaultValue('USERNAME', 'unknown');

    context.inject(global, 'extension.global');
    context.load('extension.misc').extend();
    context.inject(Flag, 'extension.flag');
    context.inject(Room, 'extension.room');
    context.load('main');
};
