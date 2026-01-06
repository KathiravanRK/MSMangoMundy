import React from 'react';
import logo from '../../utils/logo.png';

interface ThermalHeaderProps {
    showLogo?: boolean;
}

/**
 * Shared thermal print header for 80mm POS receipts.
 * Matches the exact layout from your image:
 * - MS logo with mango image
 * - Mango Mundy company name
 * - Mobile numbers
 */
const ThermalHeader: React.FC<ThermalHeaderProps> = ({ showLogo = true }) => {
    return (
        <header className="thermal-header">
            <div className="thermal-logo-container">
                {showLogo && (
                    <img src={logo} alt="Mango Logo" />
                )}
                <div className="company-name">
                    <h1 className="font-bold text-lg mb-0">MS</h1>
                    <h2 className="text-md font-bold">Mango Mundy</h2>
                </div>
            </div>
            <p className="text-sm font-bold mt-1 text-center">Mob: 9952235676, 9443735676</p>
        </header>
    );
};

export default ThermalHeader;
