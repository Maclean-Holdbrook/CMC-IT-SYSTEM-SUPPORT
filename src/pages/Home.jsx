import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';
import campusBackground from '../images/campus-reporting-background.jpg';
import adminBackground from '../images/admin-operations-background.jpg';
import workerBackground from '../images/worker-maintenance-background.jpg';

const backgroundImages = [campusBackground, adminBackground, workerBackground];

const Home = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      {/* Carousel Background */}
      <div className="background-carousel">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className={`background-slide ${index === currentImageIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${image})` }}
          />
        ))}
      </div>

      <div className="home-content">
        <h1>CAMPUS FAULT REPORTING SYSTEM</h1>
        {/* <p className="subtitle">Efficient complaint tracking and resolution</p> */}

        <div className="portal-cards">
          <div className="portal-card staff-card" onClick={() => navigate('/submit-complaint')}>
            <div className="card-icon">📝</div>
            <h2>Staff Portal</h2>
            <p>Submit a complaint</p>
            <p className="card-note">No login required</p>
          </div>

          <div className="portal-card admin-card" onClick={() => navigate('/admin/login')}>
            <div className="card-icon">👨‍💼</div>
            <h2>Admin Portal</h2>
            <p>Manage complaints and workers</p>
            <p className="card-note">Login required</p>
          </div>

          <div className="portal-card worker-card" onClick={() => navigate('/worker/login')}>
            <div className="card-icon">👷</div>
            <h2>Worker Portal</h2>
            <p>View and update tickets</p>
            <p className="card-note">Login required</p>
          </div>
        </div>

        <footer className="home-footer">
          <p>© 2026 Campus Fault Reporting System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;
