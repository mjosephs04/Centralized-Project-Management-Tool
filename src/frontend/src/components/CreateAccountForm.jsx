import React, { useState } from 'react';
import axios from 'axios';
import '../styles/components/CreateAccount.css'

const CreateAccountForm = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        confirmEmail: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: '',
    });

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.email !== formData.confirmEmail) {
            setError("Emails do not match.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                emailAddress: formData.email,
                phoneNumber: formData.phone,
                password: formData.password,
                role: formData.role.toLowerCase(),
            };

            const res = await axios.post('http://localhost:8080/api/auth/register', payload);

            setSuccess("Account created successfully!");
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                confirmEmail: '',
                phone: '',
                password: '',
                confirmPassword: '',
                role: '',
            });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <form className="create-account-form" onSubmit={handleSubmit}>
            <h1>Create Account</h1>

            <div className="input-row">
                <div className="input-field">
                    <label htmlFor='firstName'>First Name</label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        required
                        onChange={handleChange}
                    />
                </div>
                <div className="input-field">
                    <label htmlFor='lastName'>Last Name</label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        required
                        onChange={handleChange}
                    />
                </div>
            </div>

            <div className="input-field">
                <label htmlFor='email'>Email</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    required
                    onChange={handleChange}
                />
            </div>

            <div className="input-field">
                <label htmlFor='confirmEmail'>Confirm Email</label>
                <input
                    type="email"
                    id="confirmEmail"
                    name="confirmEmail"
                    value={formData.confirmEmail}
                    required
                    onChange={handleChange}
                />
            </div>

            <div className="input-field">
                <label htmlFor='phone'>Phone Number</label>
                <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    required
                    onChange={handleChange}
                />
            </div>

            <div className="input-field">
                <label htmlFor='password'>Password</label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    required
                    onChange={handleChange}
                />
            </div>

            <div className="input-field">
                <label htmlFor='confirmPassword'>Confirm Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    required
                    onChange={handleChange}
                />
            </div>

            <div className="role-select">
                <div className='role-option'>
                    <input
                        type="radio"
                        id="worker"
                        name="role"
                        value="worker"
                        checked={formData.role === 'worker'}
                        onChange={handleChange}
                        required
                    />
                    <label htmlFor="worker">Worker</label>
                </div>
                <div className='role-option'>
                    <input
                        type="radio"
                        id="pm"
                        name="role"
                        value="project_manager"
                        checked={formData.role === 'project_manager'}
                        onChange={handleChange}
                        required
                    />
                    <label for="pm">Project Manager</label>
                </div>
            </div>
            
        <button type="submit" className="butn">Create Account</button>
        </form>
    );
};

export default CreateAccountForm;