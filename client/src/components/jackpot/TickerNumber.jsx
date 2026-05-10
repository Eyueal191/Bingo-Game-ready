import React, { useState, useEffect } from "react";
import { animate } from "framer-motion";

const TickerNumber = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 1.2,
            ease: "circOut",
            onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
        });
        return controls.stop;
    }, [value, displayValue]);

    return <span>{displayValue.toLocaleString()}</span>;
};

export default TickerNumber;
