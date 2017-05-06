
let mod = {};
module.exports = mod;

// add a game object, obtained from its id, to an array
mod.addById = function(array, id){
    if(array == null) array = [];
    let obj = Game.getObjectById(id);
    if( obj ) array.push(obj);
    return array;
};
mod.guid = function(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
mod.INGREDIENTS = {
    G: ['ZK','UL'], 
    ZK: ['Z','K'],
    UL: ['U','L']
};
mod.RESOURCE_STATE = {
    BUY_URGENT: -3,
    BUY: -2,
    DEMAND: -1,
    OK: 0,
    OFFER: 1,
    SELL: 2,
    SELL_URGENT: 3
};
