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

export class PushException extends AIJobHuntingError {}

export class NotMatchException<TData = unknown> extends PushException {
  jobTitle: string;
  data: TData;

  constructor(jobTitle: string, data: TData, message = "") {
    super(message);
    this.jobTitle = jobTitle;
    this.data = data;
  }
}

export class PushReqException extends PushException {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class CollectReqException extends PushException {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class FetchJobBossFailExp extends PushException {
  jobTitle: string;

  constructor(jobTitle: string, message = "") {
    super(message);
    this.jobTitle = jobTitle;
  }
}

export class PublishStopExp extends PushException {}

export class PublishLimitExp extends PushException {}
