import React, {useState} from 'react';
import axios from 'axios';
import {Typography} from '@mui/material'
import {FaUser, FaLock} from 'react-icons/fa'
import '../styles/components/LoginForm.css'
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        emailAddress: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try{
            const res = await axios.post('http://localhost:8080/api/auth/login', formData);
            
            localStorage.setItem('accessToken', res.data.accessToken);

            setSuccess("Login Successful!");
            console.log("Logged in user:", res.data.user);
            navigate('/projects')
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Login Failed');
        }
    };


    return (
        <div className="wrapper">
            <Typography variant="h5" component="h2" gutterBottom align="center" fontSize={40} fontWeight={'bold'}>
                Login
            </Typography>

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-box">
                    <input 
                        type="text" 
                        name="emailAddress"
                        placeholder='Email Address' 
                        value={formData.emailAddress}
                        onChange={handleChange} 
                        required 
                    />
                    <span className="input-icon"><FaUser color="#6a97c4"/></span>
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
                    <span className="input-icon"><FaLock color="#6a97c4"/></span>
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