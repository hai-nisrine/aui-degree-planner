import React from 'react';
import { FaUserPlus, FaBook, FaHandPointer, FaGraduationCap, FaRoute, FaBrain, FaClock } from "react-icons/fa";
import Stepper, { Step } from './Stepper';

const Features = () => {
  const features = [
    {
      icon: <FaHandPointer />,
      title: "Drag & Drop",
      description: "Effortlessly arrange your courses with intuitive drag-and-drop functionality"
    },
    {
      icon: <FaRoute />,
      title: "Track Prerequisites",
      description: "Never miss a required course again"
    },
    {
      icon: <FaBrain />,
      title: "AI-Powered",
      description: "Integrated AI helps you pick the best courses for your goals"
    },
    {
      icon: <FaClock />,
      title: "Graduate On Time",
      description: "Stay on track and reach your goals with confidence"
    }
  ];

  return (
    <div className="about-section-container">
      {/* Features Section */}
      <div className="features-section-simple" id="features">
        <h2 className="features-heading">Why Choose Our Planner?</h2>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card-simple">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section - Interactive Stepper */}
      <div className="how-it-works-stepper-section" id="get-started">
        <h2 className="how-it-works-heading">Get Started in 4 Steps</h2>
        <p className="how-it-works-subtext">
          From sign-up to your personalized degree plan
        </p>
        
        <Stepper initialStep={1}>
          <Step>
            <div className="stepper-step-content">
              <div className="stepper-icon">
                <FaUserPlus />
              </div>
              <h3 className="stepper-title">Create Your Account</h3>
              <p className="stepper-description">
                Sign up in seconds with your university email and get instant access to your personalized planner.
              </p>
            </div>
          </Step>
          
          <Step>
            <div className="stepper-step-content">
              <div className="stepper-icon">
                <FaBook />
              </div>
              <h3 className="stepper-title">Add Your Courses</h3>
              <p className="stepper-description">
                Browse the course catalog and add the classes you're interested in or have already completed.
              </p>
            </div>
          </Step>
          
          <Step>
            <div className="stepper-step-content">
              <div className="stepper-icon">
                <FaHandPointer />
              </div>
              <h3 className="stepper-title">Drag & Drop to Plan</h3>
              <p className="stepper-description">
                Organize your courses across semesters with our intuitive drag-and-drop interface. Prerequisites are automatically tracked.
              </p>
            </div>
          </Step>
          
          <Step>
            <div className="stepper-step-content">
              <div className="stepper-icon">
                <FaGraduationCap />
              </div>
              <h3 className="stepper-title">Graduate On Time</h3>
              <p className="stepper-description">
                Follow your optimized plan and reach your graduation goals with confidence. Track your progress every step of the way.
              </p>
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
};

export default Features;