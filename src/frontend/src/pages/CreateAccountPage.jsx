import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateAccountForm from "../components/CreateAccountForm";
import backgroundImg from '../imgs/CreateAccount.png';
import '../styles/pages/CreateAccount.css';

const CreateAccountPage = () => {
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        // Preload the image
        const img = new Image();
        img.src = backgroundImg;
        img.onload = () => setImageLoaded(true);
    }, []);

    return (
        <div 
            className="create-account-page"
            style={{
                backgroundImage: imageLoaded ? `url(${backgroundImg})` : 'none',
            }}
        >
            <div className="login-button-wrapper">
                <button className="login-button" onClick={() => navigate('/login')}>
                    Login
                </button>
            </div>
            <div className="form-container">
                <CreateAccountForm />
            </div>
        </div>
    );
};

export default CreateAccountPage;