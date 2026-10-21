import test from 'node:test';import assert from 'node:assert/strict';
import {swipeTurn} from '../public/katatib/live/mushaf-swipe.mjs';
const g={dx:100,dy:10,duration:250,width:390};
test('reading direction reverses horizontal page turns',()=>{assert.equal(swipeTurn({...g,direction:'rtl'}),1);assert.equal(swipeTurn({...g,direction:'ltr'}),-1);assert.equal(swipeTurn({...g,dx:-100,direction:'ltr'}),1);assert.equal(swipeTurn({...g,dx:-100,direction:'rtl'}),-1);});
test('scrolls, taps, diagonal drags, pinches, zoom panning and slow drags never turn a page',()=>{for(const patch of [{dx:30},{dy:80},{dx:0,dy:100},{pointers:2},{zoom:150},{duration:1000},{width:0},{dx:NaN}])assert.equal(swipeTurn({...g,...patch}),0);});
