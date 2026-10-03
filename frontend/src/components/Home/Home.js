import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Features from "./components/Features/Features";
import Footer from "./components/Footer/Footer";
import { FiArrowRight } from "react-icons/fi";

const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="App">
            <Navbar />            
            
            {/* Hero Section */}
            <div className="home-container" id="home">
                <div className="home-banner-container">
                    <div className="home-text-section">
                        <h1 className="primary-heading">
                            Plan Your Degree<br />
                            <span className="underlined-text">Smarter.</span>
                        </h1>
                        <p className="primary-text">
                            AI-powered planning that adapts to you. Drag, drop, and watch your path to graduation unfold—zero mistakes, pure confidence.
                        </p>
                        <button className="secondary-button" onClick={() => navigate("/login")}>
                            Start Now <FiArrowRight />
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Features Section */}
            <Features />
            
            {/* Footer */}
            <Footer />
        </div>
    );    
};

export default Home;