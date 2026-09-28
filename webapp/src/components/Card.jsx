export default function Card({ title, subtitle, children, onClick }) {
    return (
        <div className="card" onClick={onClick}>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
            {children}
        </div>
    );
}