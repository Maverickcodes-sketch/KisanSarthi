import Counter from "../models/Counter.js";
import Token, { ACTIVE_STATUSES } from "../models/Token.js";
import { getDateKey } from "../utils/dateKey.js";
import { calculateQueueETA } from "./etaService.js";
import "../models/Service.js";

export const ARRIVAL_BUFFER_MINUTES = 15;

export const getCounterQueue = async (counterId, dateKey = getDateKey()) => {
  const tokens = await Token.find({
    counter: counterId,
    dateKey,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ queuedAt: 1, tokenNumber: 1 });

  return {
    serving: tokens.find((t) => t.status === "serving") || null,
    waiting: tokens.filter((t) => t.status === "waiting"),
  };
};

export const calculateQueueState = async (counterId, dateKey = getDateKey()) => {
  const counter = await Counter.findById(counterId).populate(
    "service",
    "name estimatedDuration averageDuration"
  );
  if (!counter) return null;

  const duration = counter.service.averageDuration || counter.service.estimatedDuration;
  const { serving, waiting } = await getCounterQueue(counter._id, dateKey);
  const etaUpdates = calculateQueueETA([serving, ...waiting].filter(Boolean), duration);
  const servingEta = etaUpdates.find(({ token }) => token.status === "serving");
  const etaByTokenId = new Map(
    etaUpdates.map((update) => [String(update.token._id), update])
  );

  const entries = waiting.map((token, index) => {
    const eta = etaByTokenId.get(String(token._id));
    return {
      ...eta,
      position: index + 1,
      aheadCount: index + (serving ? 1 : 0),
    };
  });

  const servingRemaining = servingEta
    ? Math.max(
        0,
        (servingEta.estimatedCompletionAt.getTime() - Date.now()) / 60000
      )
    : 0;

  return { counter, duration, serving, servingRemaining, entries, etaUpdates };
};

export const getTokenQueueInfo = async (token) => {
  const inactive = {
    position: null,
    aheadCount: 0,
    estimatedWaitMinutes: 0,
    estimatedStartAt: null,
    estimatedCompletionAt: null,
    etaUpdatedAt: null,
    nowServing: null,
    counterStatus: null,
    delayed: false,
  };

  if (!token.counter || !ACTIVE_STATUSES.includes(token.status)) return inactive;

  const state = await calculateQueueState(token.counter, token.dateKey);
  if (!state) return inactive;

  const counterStatus = state.counter.status;
  const delayed = counterStatus !== "active";
  const nowServing = state.serving ? state.serving.tokenCode : null;

  if (token.status === "serving") {
    const eta = state.etaUpdates.find((update) => String(update.token._id) === String(token._id));
    return {
      position: 0,
      aheadCount: 0,
      estimatedWaitMinutes: 0,
      estimatedStartAt: eta?.estimatedStartAt || null,
      estimatedCompletionAt: eta?.estimatedCompletionAt || null,
      etaUpdatedAt: eta?.etaUpdatedAt || null,
      nowServing,
      counterStatus,
      delayed,
    };
  }

  const entry = state.entries.find((e) => String(e.token._id) === String(token._id));
  if (!entry) return { ...inactive, counterStatus, delayed };

  return {
    position: entry.position,
    aheadCount: entry.aheadCount,
    estimatedWaitMinutes: entry.estimatedWaitMinutes,
    estimatedStartAt: entry.estimatedStartAt,
    estimatedCompletionAt: entry.estimatedCompletionAt,
    etaUpdatedAt: entry.etaUpdatedAt,
    nowServing,
    counterStatus,
    delayed,
  };
};

export const pickCounter = async (centerId, serviceId, dateKey = getDateKey()) => {
  const counters = await Counter.find({
    center: centerId,
    service: serviceId,
    status: "active",
    operator: { $ne: null },
  });
  if (counters.length === 0) return null;

  const loads = await Token.aggregate([
    {
      $match: {
        counter: { $in: counters.map((c) => c._id) },
        dateKey,
        status: { $in: ACTIVE_STATUSES },
      },
    },
    { $group: { _id: "$counter", count: { $sum: 1 } } },
  ]);

  const loadMap = new Map(loads.map((l) => [String(l._id), l.count]));
  const load = (counter) => loadMap.get(String(counter._id)) || 0;

  return counters.sort((a, b) => load(a) - load(b) || a.name.localeCompare(b.name))[0];
};

export const recalculateCounterQueue = async (counterId, dateKey = getDateKey()) => {
  const state = await calculateQueueState(counterId, dateKey);
  if (!state || state.etaUpdates.length === 0) return state;

  await Token.bulkWrite(
    state.etaUpdates.map((entry) => ({
      updateOne: {
        filter: { _id: entry.token._id, status: { $in: ACTIVE_STATUSES } },
        update: {
          $set: {
            estimatedWaitMinutes: entry.estimatedWaitMinutes,
            estimatedStartAt: entry.estimatedStartAt,
            estimatedCompletionAt: entry.estimatedCompletionAt,
            etaUpdatedAt: entry.etaUpdatedAt,
          },
        },
      },
    }))
  );

  return state;
};

export const suggestArrival = (waitMinutes, now = new Date()) => {
  if (waitMinutes <= ARRIVAL_BUFFER_MINUTES) {
    return {
      arriveInMinutes: 0,
      arriveAt: now.toISOString(),
      message: "Your turn is close. Please reach the center now.",
    };
  }

  const arriveInMinutes = waitMinutes - ARRIVAL_BUFFER_MINUTES;
  const arriveAt = new Date(now.getTime() + arriveInMinutes * 60000);

  return {
    arriveInMinutes,
    arriveAt: arriveAt.toISOString(),
    message: `You can reach the center in about ${arriveInMinutes} minutes.`,
  };
};