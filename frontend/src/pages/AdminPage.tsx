import { Link } from 'react-router-dom';

const AdminPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Admin Page</h1>
      <p className="text-lg mb-8">Welcome, admin!</p>
      <Link to="/" className="text-blue-500 hover:underline">
        Go back to the homepage
      </Link>
    </div>
  );
};

export default AdminPage;
