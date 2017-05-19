let mod = {};
module.exports = mod;

function flush(){
    // ocurrs when a creep starts spawning
    // param: { spawn: spawn.name, name: creep.name, destiny: creep.destiny }
    Creep.spawningStarted = new LiteEvent();

    // ocurrs when a creep completes spawning
    // param: creep
    Creep.spawningCompleted = new LiteEvent();

    // ocurrs when a creep will die in the amount of ticks required to renew it
    // param: creep
    Creep.predictedRenewal = new LiteEvent();
    
    // ocurrs when a creep dies
    // param: creep name
    Creep.died = new LiteEvent(); 
}
context.flush.on(flush);
/*
function execute(){
    Creep.spawningStarted.release();
    Creep.spawningCompleted.release();
    Creep.predictedRenewal.release();
    Creep.died.release();
}

context.flush.on(flush);
context.analyze.on(analyze);
context.execute.on(execute);
context.cleanup.on(cleanup);
*/