import {Component,type ReactNode} from 'react';
export class PageErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section role="alert" className="card-hub rounded-2xl p-6">
  <p className="text-sm text-gray-600 dark:text-gray-300">Chưa tải được trang. Có thể kết nối bị gián đoạn hoặc Dashboard vừa có bản cập nhật.</p>
  <button type="button" onClick={()=>location.reload()} className="push-settings-primary mt-3">Tải lại Dashboard</button>
 </section>:this.props.children;}
}
