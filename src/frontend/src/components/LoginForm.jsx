import React, {useState} from 'react';
import {Typography} from '@mui/material'
import {FaUser, FaLock} from 'react-icons/fa'
import '../styles/components/LoginForm.css'

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const email = [...formData]
        console.log("Logging in with:", {email});
    };


    return (
        <div className="wrapper">
            <Typography variant="h5" component="h2" gutterBottom align="center" fontSize={40} fontWeight={'bold'}>
                Login
            </Typography>
            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-box">
                    <input 
                        type="text" 
                        name="email"
                        placeholder='Email Address' 
                        value={formData.email}
                        onChange={handleChange} 
                        required 
                    />
                    <span className="input-icon"><FaUser /></span>
                </div>
                <div className='input-box'>
                    <input 
                    type="password" 
                    name="password"
                    placeholder='Password' 
                    value={formData.password}
                    onChange={handleChange} 
                    required 
                />
                    <span className="input-icon"><FaLock /></span>
                </div>
                <button
                    type="submit"
                    className='btn'
                > Sign In </button>
                <div className="forgot-password">
                    <button type="button">Forgot Password?</button>
                </div>

            </form>
        </div>
    )
};

export default LoginForm;