
## cyberblast/screeps.feature.foundation

This is a feature extension for the [screeps engine repository](https://github.com/cyberblast/screeps.engine).

Basic foundation to get screeps up & running.  

Analyzes rooms, flags & creeps & triggers events.  
Serves as basis for higher features.  
May get reduced (split up to separate features) in the future.

Key value this feature offers is a) added properties to game objects and b) the huge amount of events. Higher features can simply hook into them to implement tasks/jobs.


## Available Events

* To subscribe (attach) to an event:  
  ``Creep.spawningStarted.on(creep => log(`${creep.name} started to spawn!`));``
* To trigger an event:  
  ``Creep.spawningStarted.trigger(creep);``  
  Triggered events will not get fired immediately, but get collected until the events gets "released", which commonly happens during the *execution* phase

### Creep  
* __spawningStarted__  
  ocurrs when a creep starts spawning  
  param:
  ```JS
  { 
    spawn: spawn.name, 
    name: creep.name, 
    destiny: creep.destiny 
  }
  ```
* __spawningCompleted__  
  ocurrs when a creep completes spawning  
  param: creep
* __own__  
  ocurrs each tick for every owned creep since it has been spawned  
  param: creep
* __predictedRenewal__  
  ocurrs when a creep will die in the amount of ticks required to renew it  
  param: creep
* __died__  
  ocurrs when an owned creep dies  
  param: creep name
* __newInvader__  
  ocurrs when a new __Invader__ (npc) creep has been spotted for the first time  
  param: creep
* __knownInvader__  
  ocurrs every tick since an invader has been spotted until its not spotted anymore  
  (will also occur when there is no sight until validated its gone)  
  param: creep id
* __goneInvader__  
  ocurrs when an invader is not in the same room anymore (or died). will only occur when (or as soon as) there is sight in that room.  
  param: creep id
* __newSourceKeeper__  
  param: creep
* __knownSourceKeeper__  
  param: creep id
* __goneSourceKeeper__  
  param: creep id
* __newEnemy__  
  param: creep
* __knownEnemy__  
  param: creep id
* __goneEnemy__  
  param: creep id
* __newWhitelisted__  
  param: creep
* __knownWhitelisted__  
  param: creep id
* __goneWhitelisted__  
  param: creep id
### Room
  to be continued...
### Flag
  to be continued...

