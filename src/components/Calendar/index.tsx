/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";

import type { ScheduleInstance } from "../../models/schedule";
import type { UserInstance } from "../../models/user";

import { useDispatch } from "react-redux";
import { updateAssignmentDate } from "../../store/schedule/actions";

import FullCalendar from "@fullcalendar/react";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import type { EventClickArg, EventInput } from "@fullcalendar/core/index.js";

import "../profileCalendar.scss";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

type CalendarContainerProps = {
  schedule: ScheduleInstance;
  auth: UserInstance;
};

type EventDetails = {
  staffName: string;
  shiftName: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
} | null;

const CalendarContainer = ({ schedule, auth }: CalendarContainerProps) => {
  const calendarRef = useRef<FullCalendar>(null);

  const [events, setEvents] = useState<EventInput[]>([]);
  const [highlightedDates, setHighlightedDates] = useState<
    { pairStaffId: string; date: string }[]
  >([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffColors, setStaffColors] = useState<Map<string, string>>(
    new Map()
  );
  const [showModal, setShowModal] = useState(false);
  const [eventDetails, setEventDetails] = useState<EventDetails>(null);

  const dispatch = useDispatch();

  const getPlugins = () => {
    const plugins = [dayGridPlugin];
    plugins.push(interactionPlugin);
    return plugins;
  };

  // Her çalışan için renk üretme fonksiyonu
  const generateStaffColor = (staffId: string): string => {
    let hash = 0;
    for (let i = 0; i < staffId.length; i++) {
      hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);

    return `hsl(${hue}, 50%, 55%)`;
  };

  // Shift tipine göre renk tonunu ayarlama
  const getEventColor = (baseColor: string, shiftName: string): string => {
    const hslMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!hslMatch) return baseColor;

    const hue = hslMatch[1];
    const saturation = hslMatch[2];

    const isNightShift = shiftName?.toLowerCase().includes("night");
    const lightness = isNightShift ? 25 : 50;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Event taşıma handler'ı
  const handleEventDrop = (info: any) => {
    const assignmentId = info.event.id;
    const newDate = dayjs(info.event.start);

    const shift = getShiftById(info.event.extendedProps.shiftId);

    if (!shift) return;

    const [startHour, startMinute] = shift.shiftStart.split(":");
    const [endHour, endMinute] = shift.shiftEnd.split(":");

    const newShiftStart = newDate
      .hour(parseInt(startHour))
      .minute(parseInt(startMinute))
      .second(0)
      .toISOString();

    const newShiftEnd = newDate
      .hour(parseInt(endHour))
      .minute(parseInt(endMinute))
      .second(0)
      .toISOString();

    dispatch(
      updateAssignmentDate(assignmentId, newShiftStart, newShiftEnd) as any
    );
  };

  const getShiftById = (id: string) => {
    return schedule?.shifts?.find((shift: { id: string }) => id === shift.id);
  };

  const getAssigmentById = (id: string) => {
    return schedule?.assignments?.find((assign) => id === assign.id);
  };

  const getStaffById = (id: string) => {
    return schedule?.staffs?.find((staff) => staff.id === id);
  };

  const validDates = () => {
    const dates = [];
    let currentDate = dayjs(schedule.scheduleStartDate);
    while (
      currentDate.isBefore(schedule.scheduleEndDate) ||
      currentDate.isSame(schedule.scheduleEndDate)
    ) {
      dates.push(currentDate.format("YYYY-MM-DD"));
      currentDate = currentDate.add(1, "day");
    }

    return dates;
  };

  const getDatesBetween = (startDate: string, endDate: string) => {
    const dates = [];
    const start = dayjs(startDate, "DD.MM.YYYY", true).toDate();
    const end = dayjs(endDate, "DD.MM.YYYY", true).toDate();

    while (start <= end) {
      dates.push(dayjs(start).format("DD-MM-YYYY"));
      start.setDate(start.getDate() + 1);
    }

    return dates;
  };

  const generateStaffBasedCalendar = () => {
    const works: EventInput[] = [];

    const filteredAssignments =
      schedule?.assignments?.filter(
        (assign) => assign.staffId === selectedStaffId
      ) || [];

    const baseColor = staffColors.get(selectedStaffId || "") || "#19979c";

    for (let i = 0; i < filteredAssignments.length; i++) {
      const assignmentDate = dayjs
        .utc(filteredAssignments[i]?.shiftStart)
        .format("YYYY-MM-DD");
      const isValidDate = validDates().includes(assignmentDate);

      const shift = getShiftById(filteredAssignments[i]?.shiftId);
      const eventColor = getEventColor(baseColor, shift?.name || "");

      const work = {
        id: filteredAssignments[i]?.id,
        title: getShiftById(filteredAssignments[i]?.shiftId)?.name,
        duration: "01:00",
        date: assignmentDate,
        staffId: filteredAssignments[i]?.staffId,
        shiftId: filteredAssignments[i]?.shiftId,
        backgroundColor: eventColor,
        borderColor: eventColor,
        extendedProps: {
          shiftStart: filteredAssignments[i]?.shiftStart,
          shiftEnd: filteredAssignments[i]?.shiftEnd,
        },
        className: `event ${
          getAssigmentById(filteredAssignments[i]?.id)?.isUpdated
            ? "highlight"
            : ""
        } ${!isValidDate ? "invalid-date" : ""}`,
      };
      works.push(work);
    }

    const offDays = schedule?.staffs?.find(
      (staff) => staff.id === selectedStaffId
    )?.offDays;

    const dates = getDatesBetween(
      dayjs(schedule.scheduleStartDate).format("DD.MM.YYYY"),
      dayjs(schedule.scheduleEndDate).format("DD.MM.YYYY")
    );
    const highlightedDates: { pairStaffId: string; date: string }[] = [];

    const staff = schedule?.staffs?.find((s) => s.id === selectedStaffId);

    dates.forEach((date) => {
      const currentDate = dayjs(date, "DD-MM-YYYY");
      const transformedDate = currentDate.format("DD.MM.YYYY");

      if (offDays?.includes(transformedDate)) {
        return;
      }

      const pairList = staff?.pairList?.find((pair) => {
        const pairStart = dayjs(pair.startDate, "DD.MM.YYYY");
        const pairEnd = dayjs(pair.endDate, "DD.MM.YYYY");

        return (
          currentDate.isSameOrAfter(pairStart, "day") &&
          currentDate.isSameOrBefore(pairEnd, "day")
        );
      });

      if (pairList) {
        highlightedDates.push({ pairStaffId: pairList.staffId, date });
      }
    });

    setHighlightedDates(highlightedDates);
    setEvents(works);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const staffId = event.extendedProps.staffId;
    const staff = getStaffById(staffId);
    const shift = getShiftById(event.extendedProps.shiftId);

    const details: EventDetails = {
      staffName: staff?.name || "",
      shiftName: shift?.name || "",
      date: dayjs(event.start).format("DD.MM.YYYY"),
      startTime: dayjs(event.extendedProps.shiftStart).format("HH:mm"),
      endTime: dayjs(event.extendedProps.shiftEnd).format("HH:mm"),
      color: event.backgroundColor || "#19979c",
    };

    setEventDetails(details);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEventDetails(null);
  };

  useEffect(() => {
    if (schedule?.staffs?.length > 0) {
      const colorMap = new Map<string, string>();
      schedule.staffs.forEach((staff) => {
        colorMap.set(staff.id, generateStaffColor(staff.id));
      });
      setStaffColors(colorMap);

      if (!selectedStaffId) {
        const firstStaffId = schedule.staffs[0].id;
        setSelectedStaffId(firstStaffId);
      }
    }
  }, [schedule?.staffs]);

  useEffect(() => {
    if (selectedStaffId) {
      generateStaffBasedCalendar();
    }
  }, [selectedStaffId, schedule?.assignments]);

  const RenderEventContent = ({ eventInfo }: any) => {
    return (
      <div className="event-content">
        <p>{eventInfo.event.title}</p>
      </div>
    );
  };

  return (
    <div className="calendar-section">
      <div className="calendar-wrapper">
        <div className="staff-list">
          {schedule?.staffs?.map((staff: any) => {
            const staffColor = staffColors.get(staff.id) || "#19979c";
            return (
              <div
                key={staff.id}
                onClick={() => setSelectedStaffId(staff.id)}
                className={`staff ${
                  staff.id === selectedStaffId ? "active" : ""
                }`}
                style={{
                  borderColor: staffColor,
                  color: staff.id === selectedStaffId ? "#ffffff" : staffColor,
                  backgroundColor:
                    staff.id === selectedStaffId ? staffColor : "#ffffff",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="20px"
                  viewBox="0 -960 960 960"
                  width="20px"
                >
                  <path
                    d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17-62.5t47-43.5q60-30 124.5-46T480-440q67 0 131.5 16T736-378q30 15 47 43.5t17 62.5v112H160Zm320-400q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm160 228v92h80v-32q0-11-5-20t-15-14q-14-8-29.5-14.5T640-332Zm-240-21v53h160v-53q-20-4-40-5.5t-40-1.5q-20 0-40 1.5t-40 5.5ZM240-240h80v-92q-15 5-30.5 11.5T260-306q-10 5-15 14t-5 20v32Zm400 0H320h320ZM480-640Z"
                    style={{
                      fill:
                        staff.id === selectedStaffId ? "#ffffff" : staffColor,
                    }}
                  />
                </svg>
                <span>{staff.name}</span>
              </div>
            );
          })}
        </div>
        <FullCalendar
          ref={calendarRef}
          locale={auth.language}
          plugins={getPlugins()}
          contentHeight={500}
          handleWindowResize={true}
          selectable={true}
          editable={true}
          eventDrop={handleEventDrop}
          eventOverlap={true}
          eventDurationEditable={false}
          initialView="dayGridMonth"
          initialDate={dayjs(schedule?.scheduleStartDate).toDate()}
          events={events}
          firstDay={1}
          dayMaxEventRows={4}
          fixedWeekCount={true}
          showNonCurrentDates={true}
          buttonText={{ today: "Today" }}
          eventClick={handleEventClick}
          eventContent={(eventInfo: any) => (
            <RenderEventContent eventInfo={eventInfo} />
          )}
          dayCellContent={({ date }) => {
            const found = validDates().includes(
              dayjs(date).format("YYYY-MM-DD")
            );

            const isHighlighted = highlightedDates.some(
              (item) => item.date === dayjs(date).format("DD-MM-YYYY")
            );

            let highlightColor = "";

            if (isHighlighted) {
              const pairStaffId = highlightedDates.find(
                (item) => item.date === dayjs(date).format("DD-MM-YYYY")
              )!.pairStaffId;
              highlightColor = generateStaffColor(pairStaffId);
            }

            return (
              <div
                className={`${found ? "" : "date-range-disabled"} ${
                  isHighlighted ? "highlightedPair" : ""
                }`}
                style={{
                  borderBottom: isHighlighted
                    ? `5px solid ${highlightColor}`
                    : "",
                }}
              >
                {dayjs(date).date()}
              </div>
            );
          }}
        />
      </div>

      {/* Event Detay Modal */}
      {showModal && eventDetails && (
        <div className="event-modal-overlay" onClick={closeModal}>
          <div
            className="event-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="event-modal-header">
              <h3>Shift Details</h3>
              <button className="event-modal-close" onClick={closeModal}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#666"
                >
                  <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                </svg>
              </button>
            </div>

            <div className="event-modal-body">
              <div
                className="event-modal-color-indicator"
                style={{ backgroundColor: eventDetails.color }}
              />

              <div className="event-modal-info-row">
                <div className="event-modal-label">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="#666"
                  >
                    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17-62.5t47-43.5q60-30 124.5-46T480-440q67 0 131.5 16T736-378q30 15 47 43.5t17 62.5v112H160Z" />
                  </svg>
                  Employee Name
                </div>
                <div className="event-modal-value">
                  {eventDetails.staffName}
                </div>
              </div>

              <div className="event-modal-info-row">
                <div className="event-modal-label">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="#666"
                  >
                    <path d="M320-280q17 0 28.5-11.5T360-320q0-17-11.5-28.5T320-360q-17 0-28.5 11.5T280-320q0 17 11.5 28.5T320-280Zm0-160q17 0 28.5-11.5T360-480q0-17-11.5-28.5T320-520q-17 0-28.5 11.5T280-480q0 17 11.5 28.5T320-440Zm0-160q17 0 28.5-11.5T360-640q0-17-11.5-28.5T320-680q-17 0-28.5 11.5T280-640q0 17 11.5 28.5T320-600Zm160 320q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480q0 17 11.5 28.5T480-440Zm0-160q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm160 320q17 0 28.5-11.5T680-320q0-17-11.5-28.5T640-360q-17 0-28.5 11.5T600-320q0 17 11.5 28.5T640-280Zm0-160q17 0 28.5-11.5T680-480q0-17-11.5-28.5T640-520q-17 0-28.5 11.5T600-480q0 17 11.5 28.5T640-440Zm0-160q17 0 28.5-11.5T680-640q0-17-11.5-28.5T640-680q-17 0-28.5 11.5T600-640q0 17 11.5 28.5T640-600ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Z" />
                  </svg>
                  Shift Name
                </div>
                <div className="event-modal-value">
                  {eventDetails.shiftName}
                </div>
              </div>

              <div className="event-modal-info-row">
                <div className="event-modal-label">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="#666"
                  >
                    <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Z" />
                  </svg>
                  Date
                </div>
                <div className="event-modal-value">{eventDetails.date}</div>
              </div>

              <div className="event-modal-info-row">
                <div className="event-modal-label">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="#666"
                  >
                    <path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
                  </svg>
                  Start Time
                </div>
                <div className="event-modal-value">
                  {eventDetails.startTime}
                </div>
              </div>

              <div className="event-modal-info-row">
                <div className="event-modal-label">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="#666"
                  >
                    <path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
                  </svg>
                  End Time
                </div>
                <div className="event-modal-value">{eventDetails.endTime}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarContainer;
