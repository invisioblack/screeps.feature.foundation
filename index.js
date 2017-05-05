
let mod = {};
module.exports = mod;

mod.install = function(){
    context.requiresMemory = false;
    context.memoryPartitions = ['objects', 'volatile', 'rooms', 'hostiles'];
    context.inject(global, 'extension.global');
    context.load('extension.misc').extend();
    context.inject(Room, 'extension.room');
};
