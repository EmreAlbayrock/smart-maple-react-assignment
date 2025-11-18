/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { Action } from "redux-actions";

import { put, takeEvery } from "redux-saga/effects";

import Logger from "../../utils/logger";
import { updateProgress } from "../ui/actions";
import * as actions from "./actions";
import types from "./types";

import { scheduleReponse } from "../../constants/api";
import type { Callbacks } from "../../utils/types";

function loadScheduleFromStorage() {
  try {
    const savedSchedule = localStorage.getItem("schedule_data");
    if (savedSchedule) {
      return JSON.parse(savedSchedule);
    }
  } catch (error) {
    Logger.error("Error loading schedule from storage:", error);
  }
  return null;
}

function saveScheduleToStorage(schedule: any) {
  try {
    localStorage.setItem("schedule_data", JSON.stringify(schedule));
  } catch (error) {
    Logger.error("Error saving schedule to storage:", error);
  }
}

function* asyncFetchSchedule({
  payload: { onSuccess, onError } = {},
}: Action<Callbacks>) {
  yield put(updateProgress());
  try {
    const savedSchedule = loadScheduleFromStorage();

    let scheduleData;
    if (savedSchedule) {
      scheduleData = savedSchedule;
    } else {
      scheduleData = scheduleReponse.data;
      saveScheduleToStorage(scheduleData);
    }

    yield put(actions.fetchScheduleSuccess(scheduleData));

    onSuccess && onSuccess({ data: scheduleData });
  } catch (err) {
    Logger.error(err);
    onError && onError(err);

    yield put(actions.fetchScheduleFailed());
  } finally {
    yield put(updateProgress(false));
  }
}

function* asyncUpdateAssignmentDate({ payload }: Action<any>) {
  try {
    const currentSchedule = loadScheduleFromStorage() || scheduleReponse.data;
    const { assignmentId, newShiftStart, newShiftEnd } = payload;
    const updatedAssignments = currentSchedule.assignments.map(
      (assignment: any) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              shiftStart: newShiftStart,
              shiftEnd: newShiftEnd,
              isUpdated: true,
            }
          : assignment
    );
    const updatedSchedule = {
      ...currentSchedule,
      assignments: updatedAssignments,
    };
    saveScheduleToStorage(updatedSchedule);

    yield;
  } catch (err) {
    Logger.error("Error updating assignment:", err);
    yield;
  }
}

const scheduleSagas = [
  takeEvery(types.FETCH_SCHEDULE, asyncFetchSchedule),
  takeEvery(types.UPDATE_ASSIGNMENT_DATE, asyncUpdateAssignmentDate),
];

export default scheduleSagas;
