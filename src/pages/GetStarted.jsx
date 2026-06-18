import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Users, QrCode, BarChart3, ArrowRight, CheckCircle, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Button component extracted and defined locally
const Button = React.forwardRef(({ className = "", variant = "default", size = "default", asChild = false, onClick, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  
  const variantClass = variant === "outline" ? "btn-outline" : variant === "ghost" ? "btn-ghost" : "btn-default";
  const sizeClass = size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "";
  
  return (
    <Comp
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      ref={ref}
      onClick={onClick}
      {...props}
    />
  )
})
Button.displayName = "Button"

// Card components extracted and defined locally
const Card = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`card ${className}`}
    {...props}
  />
))
Card.displayName = "Card"

const CardContent = React.forwardRef(({ className = "", ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
CardContent.displayName = "CardContent"

export default function GetStarted() {
  const navigate = useNavigate();
  
  // Web images
  const infotessLogo = "https://placehold.co/400x100/aa3bff/white?text=INFOTESS";
  const infoLab = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";

  const handleNavigate = (path) => {
    navigate(path);
  };

  // Inline styles for the page
  const styles = {
    // Button styles
    btnBase: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      border: 'none',
      fontFamily: 'inherit',
    },
    btnDefault: {
      backgroundColor: '#aa3bff',
      color: '#ffffff',
      padding: '10px 20px',
    },
    btnOutline: {
      backgroundColor: 'transparent',
      color: '#ffffff',
      border: '1px solid rgba(255,255,255,0.3)',
      padding: '10px 20px',
    },
    btnGhost: {
      backgroundColor: 'transparent',
      color: '#ffffff',
      padding: '10px 20px',
    },
    btnLg: {
      padding: '12px 32px',
      fontSize: '16px',
    },
    btnSm: {
      padding: '6px 16px',
      fontSize: '12px',
    },
    
    // Layout styles
    landingContainer: {
      minHeight: '100vh',
      backgroundColor: '#000',
    },
    
    // Hero section
    heroSection: {
      position: 'relative',
      height: '100vh',
      overflow: 'hidden',
    },
    heroBgContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    heroBgImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      animation: 'zoomIn 20s ease-in-out infinite',
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
    },
    
    // Navbar
    navbar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      padding: '20px 0',
    },
    navbarContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    navbarLogoLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
    },
    navbarLogoBox: {
      width: '40px',
      height: '40px',
      backgroundColor: '#aa3bff',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navbarLogo: {
      width: '30px',
      height: '30px',
      objectFit: 'contain',
    },
    navbarTitle: {
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '600',
      letterSpacing: '1px',
    },
    navbarActions: {
      display: 'flex',
      gap: '12px',
    },
    
    // Hero content
    heroContentArea: {
      position: 'relative',
      zIndex: 2,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 20px',
    },
    heroTextContainer: {
      maxWidth: '800px',
      color: '#ffffff',
    },
    heroLogoBox: {
      width: '80px',
      height: '80px',
      backgroundColor: '#aa3bff',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
    },
    heroLogo: {
      width: '60px',
      height: '60px',
      objectFit: 'contain',
    },
    heroTitle: {
      fontSize: '48px',
      fontWeight: '700',
      marginBottom: '10px',
      letterSpacing: '2px',
    },
    heroSubtitle: {
      fontSize: '24px',
      fontWeight: '500',
      marginBottom: '10px',
      opacity: 0.9,
    },
    heroTagline: {
      fontSize: '18px',
      marginBottom: '20px',
      opacity: 0.8,
    },
    heroDesc: {
      fontSize: '16px',
      lineHeight: '1.6',
      marginBottom: '30px',
      opacity: 0.9,
      maxWidth: '600px',
      margin: '0 auto 30px',
    },
    heroButtons: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    
    // Features section - fixed height, scrollable
    featuresSection: {
      padding: '60px 20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    featuresTitle: {
      textAlign: 'center',
      fontSize: '36px',
      fontWeight: '700',
      marginBottom: '16px',
      color: '#1a1a1a',
    },
    featuresSubtitle: {
      textAlign: 'center',
      fontSize: '18px',
      color: '#666',
      marginBottom: '48px',
    },
    featuresGrid: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '30px',
      padding: '0 20px',
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer',
    },
    cardContent: {
      padding: '30px',
      textAlign: 'center',
    },
    featuresIconBox: {
      width: '60px',
      height: '60px',
      backgroundColor: '#f0e6ff',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      color: '#aa3bff',
    },
    featuresCardTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#1a1a1a',
    },
    featuresCardDesc: {
      fontSize: '14px',
      color: '#666',
      lineHeight: '1.5',
    },
    
    // Why section
    whySection: {
      padding: '80px 20px',
      backgroundColor: '#ffffff',
    },
    whyContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    whyGrid: {
      maxWidth: '900px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
    },
    whyItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '20px',
      padding: '20px',
      borderRadius: '12px',
      backgroundColor: '#f8f9fa',
    },
    whyIconBox: {
      width: '50px',
      height: '50px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    whyIconBoxGreen: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    whyIconBoxBlue: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
    },
    whyIconBoxAmber: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    whyItemTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#1a1a1a',
    },
    whyItemDesc: {
      fontSize: '14px',
      color: '#666',
      lineHeight: '1.5',
    },
    
    // Footer
    footer: {
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      textAlign: 'center',
      padding: '20px',
      fontSize: '14px',
    },
  };

  return (
    <div style={styles.landingContainer}>
      {/* Global styles for animations */}
      <style>
        {`
          @keyframes zoomIn {
            0% { transform: scale(1); }
            100% { transform: scale(1.1); }
          }
          
          .animate-fade-in {
            animation: fadeIn 1s ease-in;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          }
        `}
      </style>
      
      {/* Fullscreen Hero Background */}
      <div style={styles.heroSection}>
        {/* Background image with zoom animation */}
        <div style={styles.heroBgContainer}>
          <img
            src={infoLab}
            alt="INFOTESS Lab"
            style={styles.heroBgImg}
          />
          <div style={styles.heroOverlay} />
        </div>

        {/* Navbar */}
        <header style={styles.navbar}>
          <div style={styles.navbarContainer}>
            <div style={styles.navbarLogoLink} onClick={() => handleNavigate('/')}>
              <div style={styles.navbarLogoBox}>
                <img src={infotessLogo} alt="INFOTESS Logo" style={styles.navbarLogo} />
              </div>
              <span style={styles.navbarTitle}>INFOCTESS CLASS SMART ATTENDANCE</span>
            </div>
            <div style={styles.navbarActions}>
              <button
                onClick={() => handleNavigate('/login')}
                style={{
                  ...styles.btnBase,
                  ...styles.btnGhost,
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => handleNavigate('/register')}
                style={{
                  ...styles.btnBase,
                  ...styles.btnDefault,
                }}
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div style={styles.heroContentArea}>
          <div style={styles.heroTextContainer} className="animate-fade-in">
            {/* Logo Hero */}
            <div style={styles.heroLogoBox}>
              <img src={infotessLogo} alt="INFOTESS Logo" style={styles.heroLogo} />
            </div>

            <h1 style={styles.heroTitle}>
              INFOCTESS
            </h1>
            <p style={styles.heroSubtitle}>
              Class Smart Attendance
            </p>
            <p style={styles.heroTagline}>
              Technology For Development
            </p>
            <p style={styles.heroDesc}>
              Redefining student attendance across all groups for each course with QR codes, session codes, and real-time dashboards.
            </p>
            <div style={styles.heroButtons}>
              <button
                onClick={() => handleNavigate('/register')}
                style={{
                  ...styles.btnBase,
                  ...styles.btnDefault,
                  ...styles.btnLg,
                  fontWeight: '700',
                }}
              >
                Register
                <ArrowRight style={{ marginLeft: '8px' }} />
              </button>
              <button
                onClick={() => handleNavigate('/login')}
                style={{
                  ...styles.btnBase,
                  ...styles.btnOutline,
                  ...styles.btnLg,
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features - Full screen fixed */}
      <section style={styles.featuresSection}>
        <h2 style={styles.featuresTitle}>How It Works</h2>
        <p style={styles.featuresSubtitle}>Simple, fast, and reliable attendance tracking for your university courses</p>
        <div style={styles.featuresGrid}>
          <div style={styles.card} className="card">
            <div style={styles.cardContent}>
              <div style={styles.featuresIconBox}>
                <QrCode size={30} />
              </div>
              <h3 style={styles.featuresCardTitle}>QR Code & Session Codes</h3>
              <p style={styles.featuresCardDesc}>Course reps generate QR codes and session codes. Students scan or type to check in instantly.</p>
            </div>
          </div>
          <div style={styles.card} className="card">
            <div style={styles.cardContent}>
              <div style={styles.featuresIconBox}>
                <Users size={30} />
              </div>
              <h3 style={styles.featuresCardTitle}>Group-Based Management</h3>
              <p style={styles.featuresCardDesc}>Custom student groups, each with a course representative managing attendance for all registered courses.</p>
            </div>
          </div>
          <div style={styles.card} className="card">
            <div style={styles.cardContent}>
              <div style={styles.featuresIconBox}>
                <BarChart3 size={30} />
              </div>
              <h3 style={styles.featuresCardTitle}>Real-Time Reports</h3>
              <p style={styles.featuresCardDesc}>Lecturers view live attendance data. Students below 75% are automatically flagged.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section style={styles.whySection}>
        <div style={styles.whyContainer}>
          <h2 style={styles.featuresTitle}>Why INFOCTESS?</h2>
          <div style={styles.whyGrid}>
            <div style={styles.whyItem}>
              <div style={{...styles.whyIconBox, ...styles.whyIconBoxGreen}}>
                <CheckCircle size={24} />
              </div>
              <div>
                <h4 style={styles.whyItemTitle}>Accurate Tracking</h4>
                <p style={styles.whyItemDesc}>Proximity-based verification ensures students are physically present in the classroom.</p>
              </div>
            </div>
            <div style={styles.whyItem}>
              <div style={{...styles.whyIconBox, ...styles.whyIconBoxBlue}}>
                <Shield size={24} />
              </div>
              <div>
                <h4 style={styles.whyItemTitle}>Secure & Reliable</h4>
                <p style={styles.whyItemDesc}>Session codes expire automatically and QR codes are unique per session.</p>
              </div>
            </div>
            <div style={styles.whyItem}>
              <div style={{...styles.whyIconBox, ...styles.whyIconBoxAmber}}>
                <Clock size={24} />
              </div>
              <div>
                <h4 style={styles.whyItemTitle}>Real-Time Data</h4>
                <p style={styles.whyItemDesc}>Instant attendance reports for lecturers and students alike.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        © 2026 INFOCTESS CLASS SMART ATTENDANCE. Smart University Attendance Management.
      </footer>
    </div>
  );
}