import { useEffect, useMemo, useRef, useState } from "react";

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const inputFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date) {
  return inputFormatter.format(date);
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function getCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(1 - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function DateSelector({ id, label, name, defaultDate }) {
  const initialDate = useMemo(() => defaultDate ?? new Date(), [defaultDate]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [displayValue, setDisplayValue] = useState(formatDate(initialDate));
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function moveMonth(monthOffset) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1),
    );
  }

  function selectDate(date) {
    setSelectedDate(date);
    setDisplayValue(formatDate(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsOpen(false);
  }

  function selectToday() {
    selectDate(today);
  }

  function clearDate() {
    setSelectedDate(null);
    setDisplayValue("");
    setIsOpen(false);
  }

  function handleInputKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="date-selector" ref={pickerRef}>
      <label className="evaluation-field" htmlFor={id}>
        <span>{label}</span>
        <span className="date-selector-control">
          <input
            id={id}
            name={name}
            type="text"
            value={displayValue}
            onChange={(event) => setDisplayValue(event.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />
          <button
            type="button"
            className="date-toggle"
            aria-label="Open interview date picker"
            onClick={() => setIsOpen((currentValue) => !currentValue)}
          />
        </span>
      </label>

      {isOpen ? (
        <div className="date-popover" role="dialog" aria-label="Choose interview date">
          <div className="date-popover-header">
            <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>
              Prev
            </button>
            <strong>{monthFormatter.format(visibleMonth)}</strong>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>
              Next
            </button>
          </div>

          <div className="weekday-row" aria-hidden="true">
            {weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date) => {
              const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isToday = isSameDay(date, today);

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  className={[
                    "calendar-day",
                    isOutsideMonth ? "outside-month" : "",
                    isSelected ? "selected-day" : "",
                    isToday ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={isSelected}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-popover-actions">
            <button type="button" onClick={clearDate}>
              Clear
            </button>
            <button type="button" onClick={selectToday}>
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DateSelector;
