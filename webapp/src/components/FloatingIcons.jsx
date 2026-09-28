const ICONS = [
    { char: "▶", top: "8%",  left: "10%",  delay: "0s"   },
    { char: "♬", top: "15%", left: "78%",  delay: "3s"   },
    { char: "♪", top: "35%", left: "20%",  delay: "6s"   },
    { char: "☁", top: "55%", left: "85%",  delay: "2s"   },
    { char: "◉", top: "70%", left: "15%",  delay: "5s"   },
    { char: "◆", top: "80%", left: "70%",  delay: "8s"   },
    { char: "△", top: "45%", left: "50%",  delay: "4s"   },
    { char: "★", top: "25%", left: "45%",  delay: "7s"   },
    { char: "◈", top: "60%", left: "35%",  delay: "1s"   },
    { char: "□", top: "90%", left: "40%",  delay: "9s"   }
];

export default function FloatingIcons() {
    return (
        <div className="floating-icons" aria-hidden="true">
            {ICONS.map((icon, i) => (
                <span
                    key={i}
                    className="float-icon"
                    style={{
                        top: icon.top,
                        left: icon.left,
                        animationDelay: icon.delay
                    }}
                >
                    {icon.char}
                </span>
            ))}
        </div>
    );
}