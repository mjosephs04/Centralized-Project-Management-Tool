import React, {useState} from "react";
import { Link } from 'react-router-dom';
import { FaEnvelope, FaUserCircle } from "react-icons/fa";
import logo from '../imgs/tempLogo.webp'; 

const styles = {
    navbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2.5rem',
        background: 'linear-gradient(90deg, #000000, #0052D4)',
        borderBottomLeftRadius: '25px',
        borderBottomRightRadius: '25px',
        position: 'sticky',
        top: 0,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 1000,
    },

    logoImage: {
        height: '45px',
        width: 'auto',
    },

    navbarIcons: {
        display: 'flex',
        gap: '1.5rem',
    },

    icon: {
        color: '#ffffff',
        cursor: 'pointer',
        transition: 'color 0.2s ease-in-out',
        height: '30px',
        width: 'auto',
    },

    iconHover: {
        color: '#90c5fc',
    }
};

const UserNavbar = () => {
    const [isHovered, setIsHovered] = useState({
        inbox: false,
        profile: false,
    });

    return (
        <nav style={styles.navbar}>
            <Link to="/projects">
                <img src={logo} alt="Logo" style={styles.logoImage} />
            </Link>

            <div style={styles.navbarIcons}>
                <FaEnvelope
                    size={26}
                    style={{
                        ...styles.icon,
                        ...(isHovered.mail ? styles.iconHover : null)
                    }}
                    onMouseEnter={() => setIsHovered({ ...isHovered, mail: true})}
                    onMouseLeave={() => setIsHovered({ ...isHovered, mail: false})}
                />
                <Link to="/profile">
                    <FaUserCircle
                        size={26}
                        style={{
                            ...styles.icon,
                            ...(isHovered.profile ? styles.iconHover : null)
                        }}
                        onMouseEnter={() => setIsHovered({ ...isHovered, profile: true })}
                        onMouseLeave={() => setIsHovered({ ...isHovered, profile: false })}
                    />
                </Link>
            </div>
        </nav>
    );
}

export default UserNavbar;
