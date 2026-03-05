// -*- coding: utf-8 -*-

export class AIJobHuntingError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class PlatformError extends AIJobHuntingError {
  platform: string | number;

  constructor(platformType: string | number, message: string) {
    super(message);
    this.platform = platformType;
  }
}

export class PushError extends AIJobHuntingError {}

export class NotMatchError<TData = unknown> extends PushError {
  jobTitle: string;
  data: TData;

  constructor(jobTitle: string, data: TData, message = "") {
    super(message);
    this.jobTitle = jobTitle;
    this.data = data;
  }
}

export class PushRequestError extends PushError {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class FavoriteRequestError extends PushError {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class FetchJobDetailError extends PushError {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class PushStopError extends PushError {}

export class PushLimitError extends PushError {}
