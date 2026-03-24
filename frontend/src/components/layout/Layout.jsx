import { Outlet } from 'react-router-dom';
import Header from './Header';
import ToastContainer from './ToastContainer';

export default function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="layout__main">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
