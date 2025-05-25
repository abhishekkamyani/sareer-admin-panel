import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center px-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <Button type="primary" className='!bg-primary' size="large" onClick={() => navigate('/')}>
        Go Back Home
      </Button>
    </div>
  );
};

export default NotFound;
