import {useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';

// Only the page scroll controls chrome. Scrolling a menu or drawer does not.
export function useMobileChrome(){
 const {pathname}=useLocation();
 const [hidden,setHidden]=useState(false);
 useEffect(()=>{
  const surface=document.getElementById('main-scroll-container');
  const media=window.matchMedia('(max-width: 1279px)');
  if(!surface)return;
  let last=surface.scrollTop,travel=0,frame=0;
  const reset=()=>{last=surface.scrollTop;travel=0;setHidden(false);};
  const update=()=>{
   frame=0;if(!media.matches){reset();return;}
   const top=Math.max(0,surface.scrollTop),delta=top-last;last=top;
   if(top<=20){travel=0;setHidden(false);return;}
   if(delta&&Math.sign(delta)!==Math.sign(travel))travel=0;
   travel+=delta;
   if(travel>24&&top>60){setHidden(true);travel=0;}
   else if(travel< -20){setHidden(false);travel=0;}
  };
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};
  reset();surface.addEventListener('scroll',scroll,{passive:true});media.addEventListener('change',reset);
  return()=>{surface.removeEventListener('scroll',scroll);media.removeEventListener('change',reset);cancelAnimationFrame(frame);};
 },[pathname]);
 return hidden;
}
