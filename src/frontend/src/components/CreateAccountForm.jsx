import React, { useState } from 'react';
import '../styles/components/CreateAccount.css'

const CreateAccountForm = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        confirmEmail: '',
        password: '',
        confirmPassword: '',
        role: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted:', formData);
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
                        value="Worker"
                        onChange={handleChange}
                        required
                    />
                    <label for="worker">Worker</label>
                </div>
                <div className='role-option'>
                    <input
                        type="radio"
                        id="pm"
                        name="role"
                        value="project_manager"
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