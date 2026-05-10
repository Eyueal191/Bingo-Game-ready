import React from "react";
import { useNavbar } from "../../hooks/useNavbar";
import DesktopNav from "../../components/Navbar/DesktopNav";
import MobileNav from "../../components/Navbar/MobileNav";

/**
 * NavBar - Entry point for the platform navigation.
 * 
 * This is a "Container" component that consumes the useNavbar hook
 * and delegates rendering to DesktopNav or MobileNav based on screen size.
 */
const NavBar = () => {
  const navbarProps = useNavbar();

  return navbarProps.isMobile ? (
    <MobileNav {...navbarProps} />
  ) : (
    <DesktopNav {...navbarProps} />
  );
};

export default NavBar;
