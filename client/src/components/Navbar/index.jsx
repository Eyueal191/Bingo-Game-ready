import React from "react";
import { useNavbar } from "../../hooks/useNavbar";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";

/**
 * Navbar - Entry point for the platform navigation.
 * 
 * This is a "Container" component that consumes the useNavbar hook
 * and delegates rendering to DesktopNav or MobileNav based on screen size.
 */
const Navbar = () => {
  const navbarProps = useNavbar();

  return navbarProps.isMobile ? (
    <MobileNav {...navbarProps} />
  ) : (
    <DesktopNav {...navbarProps} />
  );
};

export default Navbar;