
export default function CardStats({ stats, children }) {
  return (
    <div className="flex justify-center items-stretch gap-2 w-full px-2 py-1 bg-bingo-bg">
      {stats.map((item, index) => (
        <div
          key={index}
          className="flex-1 flex flex-col justify-between items-center shadow-lg py-2 min-h-[60px]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-txt-main mt-1">
            {item.label}
          </p>
          <p className={`text-xl sm:text-2xl font-black text-center leading-none mb-1 ${item.color}`}>
            {item.value}
          </p>
        </div>
      ))}
      {children}
    </div>
  );
}