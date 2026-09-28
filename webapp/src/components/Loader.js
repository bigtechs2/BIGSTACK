export default function Loader({ fullScreen = false, text = "Loading..." }) {
    if (fullScreen) {
        return (
            <div className="loader-fullscreen">
                <div className="spinner" />
                <div className="loader-text">{text}</div>
            </div>
        );
    }

    return (
        <div className="loader">
            <div className="spinner" />
        </div>
    );
}