import { Outlet } from 'react-router-dom';
import Header from './Header';
import ToastContainer from './ToastContainer';

export default function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
