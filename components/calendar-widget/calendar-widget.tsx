'use client';

import { useState, useRef, useEffect, useLayoutEffect, type FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Clock3 } from 'lucide-react';

export interface CalendarEvent {
  title: string;
  time: string;
}

export interface EventsData {
  [key: string]: CalendarEvent[];
}

interface DateItem {
  day: number;
  fullDate: string;
  month: number;
  year: number;
  dateObj: Date;
  dayOfWeek: number;
  dayName: string;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export interface CalendarWidgetProps {
  events: EventsData;
  initialSelectedDate: string;
  currentMonthYear: string;
}

const daysOfWeek: string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarWidget: FC<CalendarWidgetProps> = ({
  events,
  initialSelectedDate,
  currentMonthYear,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef<boolean>(false);
  const startX = useRef<number>(0);
  const scrollLeftStart = useRef<number>(0);
  const hasPositionedInitialDate = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      startX.current = e.pageX - el.offsetLeft;
      scrollLeftStart.current = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };

    const onMouseLeave = () => {
      isDragging.current = false;
      el.style.cursor = 'grab';
    };

    const onMouseUp = () => {
      isDragging.current = false;
      el.style.cursor = 'grab';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX.current) * 1;
      el.scrollLeft = scrollLeftStart.current - walk;
    };

    el.style.cursor = 'grab';
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const selectedDateObject = parseDateKey(selectedDate);
  const initialDate = parseDateKey(initialSelectedDate);
  const firstDate = new Date(
    initialDate.getFullYear(),
    initialDate.getMonth(),
    1,
  );
  const numberOfDays = new Date(
    initialDate.getFullYear(),
    initialDate.getMonth() + 1,
    0,
  ).getDate();

  const dates: DateItem[] = Array.from({ length: numberOfDays }, (_, i) => {
    const date = new Date(firstDate.getFullYear(), firstDate.getMonth(), i + 1);
    return {
      day: date.getDate(),
      fullDate: toDateKey(date),
      month: date.getMonth(),
      year: date.getFullYear(),
      dateObj: date,
      dayOfWeek: date.getDay(),
      dayName: daysOfWeek[date.getDay()],
    };
  });

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const selected = container?.querySelector<HTMLElement>(
      `[data-date="${selectedDate}"]`,
    );

    if (!container || !selected) return;

    const left =
      selected.offsetLeft - container.clientWidth / 2 + selected.clientWidth / 2;

    if (!hasPositionedInitialDate.current) {
      container.scrollLeft = left;
      hasPositionedInitialDate.current = true;
      return;
    }

    container.scrollTo({ left, behavior: 'smooth' });
  }, [selectedDate]);

  const selectedEvents = events[selectedDate] ?? [];
  const selectedDateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(selectedDateObject);

  return (
      <div className="flex w-[340px] flex-col rounded-[30px] border border-black/10 bg-[#F6F5FA] shadow-lg transition-colors duration-500 select-none dark:border-white/5 dark:bg-zinc-900">
        <div className="p-4">
          <motion.div
            key={currentMonthYear}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-2 text-xl font-semibold dark:text-white"
          >
            {currentMonthYear}
          </motion.div>

          <div className="relative">
            <div
              ref={scrollRef}
              className="scrollbar-hide flex gap-2 overflow-x-auto px-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {dates.map((date) => {
                const isSelected = selectedDate === date.fullDate;
                const hasEvent = events[date.fullDate]?.length > 0;

                return (
                  <div
                    key={date.fullDate}
                    data-date={date.fullDate}
                    className="relative flex min-w-10 flex-col items-center pt-4"
                  >
                    <div
                      className={`mb-1 text-base font-medium transition-colors duration-300 ${isSelected
                          ? 'text-black dark:text-white'
                          : 'text-gray-500 dark:text-zinc-500'
                        }`}
                    >
                      {date.dayName}
                    </div>

                    <motion.button
                      type="button"
                      aria-label={`Select ${date.fullDate}`}
                      aria-pressed={isSelected}
                      className="relative flex cursor-pointer flex-col items-center"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedDate(date.fullDate)}
                    >
                      <div className="relative flex h-10 w-10 items-center justify-center">
                        {isSelected && (
                          <motion.div
                            layoutId="selected-date-bg"
                            transition={{
                              type: 'spring',
                              stiffness: 180,
                              damping: 22,
                            }}
                            className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-zinc-800"
                          />
                        )}
                        <span
                          className={`relative z-10 text-base font-medium ${isSelected
                              ? 'text-black dark:text-white'
                              : 'text-black/80 dark:text-zinc-400'
                            }`}
                        >
                          {date.day}
                        </span>
                      </div>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {hasEvent && !isSelected && (
                          <motion.span
                            initial={{
                              opacity: 0,
                              scale: 0,
                              filter: 'blur(4px)',
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              filter: 'blur(0px)',
                            }}
                            exit={{ opacity: 0, scale: 0, filter: 'blur(4px)' }}
                            transition={{
                              duration: 0.3,
                            }}
                            className="h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#cecdd1] will-change-transform dark:bg-zinc-700"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative flex h-60 flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white px-4 pt-3 transition-colors duration-500 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/10">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                Your schedule
              </p>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {selectedDateLabel}
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <motion.div className="no-scrollbar relative h-full overflow-y-scroll">
            <AnimatePresence mode="popLayout" initial={false}>
              {selectedEvents.length ? (
                <motion.div key={selectedDate} className="space-y-1 pb-8 pt-2">
                  {selectedEvents.map((event) => (
                    <motion.div
                      key={`${event.time}-${event.title}`}
                      initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                      transition={{
                        duration: 0.3,
                        ease: 'easeOut',
                      }}
                      className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                        <Clock3 className="size-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {event.title}
                        </span>
                        <span className="block text-xs text-zinc-400 dark:text-zinc-500">
                          {event.time}
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="no-events"
                  initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                  className="flex h-32 flex-col items-center justify-center gap-2"
                >
                  <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
                    <CalendarDays className="size-5 text-zinc-500 dark:text-zinc-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      A clear day
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Nothing is competing for your time.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-[30px] bg-linear-to-t from-white to-transparent dark:from-zinc-950" />
        </div>
      </div>
  );
};
