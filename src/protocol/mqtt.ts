// -*- coding: utf-8 -*-
import { Logger, LogLevel } from "@/utils/logger";

export type MqttEncodePacket = {
  messageId?: number;
  payload: string | Uint8Array;
};

export type MqttDecodePacket = {
  topic: string;
  payload: Uint8Array;
  dup: boolean;
  retain: boolean;
  qos: number;
  messageId: number;
};

const logger = new Logger();
logger.setLogLevel(LogLevel.Debug);

export function encodeLength(len: number): number[] {
  const output: number[] = [];
  let x2 = len;
  do {
    let encodedByte = x2 % 128;
    x2 = Math.floor(x2 / 128);
    if (x2 > 0) {
      encodedByte |= 128;
    }
    output.push(encodedByte);
  } while (x2 > 0);

  return output;
}

export function encodeUTF8String(str2: string, encoder: TextEncoder): number[] {
  const bytes = encoder.encode(str2);
  return [bytes.length >> 8, bytes.length & 255, ...bytes];
}

export function decodeUTF8String(
  buffer: Uint8Array,
  startIndex: number,
  utf8Decoder: TextDecoder
): { length: number; value: string } | undefined {
  const bytes = decodeUint8Array(buffer, startIndex);
  if (bytes === void 0) {
    return void 0;
  }

  const value = utf8Decoder.decode(bytes);
  return {
    length: bytes.length + 2,
    value
  };
}

export const mqtt = {
  encode(packet: MqttEncodePacket): Uint8Array {
    const utf8 = new TextEncoder();
    const variableHeader = [...encodeUTF8String("chat", utf8)];
    if (packet.messageId) {
      variableHeader.push(packet.messageId >> 8, packet.messageId & 255);
    }

    let { payload } = packet;
    if (typeof payload === "string") {
      payload = utf8.encode(payload);
    }

    const fixedHeader = [
      3 << 4 | 3,
      // 0x00110011 qos1消息，非重传、保留消息
      ...encodeLength(variableHeader.length + payload.length)
    ];
    return Uint8Array.from([...fixedHeader, ...variableHeader, ...payload]);
  },

  decode(buffer: Uint8Array, flags = 3): MqttDecodePacket {
    const dup = !!(flags & 8);
    const qos = (flags & 6) >> 1;
    const { bytesUsedToEncodeLength } = decodeLength(buffer, 1);
    const retain = !!(flags & 1);

    const utf = new TextDecoder("utf-8");
    const topicStart = bytesUsedToEncodeLength + 1;
    let decodedTopic = decodeUTF8String(buffer, topicStart, utf);
    if (decodedTopic === void 0) {
      logger.trace("空主题");
      decodedTopic = { length: 0, value: "" };
    }

    const topic = decodedTopic.value;
    let id = 0;
    let payloadStart = topicStart + decodedTopic.length;
    if (qos > 0) {
      const idStart = payloadStart;
      try {
        id = parseMessageId(buffer, idStart);
      } catch {
        logger.trace("错的id?: ", {
          payloadStart,
          topicStart,
          topic,
          dup,
          qos,
          retain
        });
      }
      payloadStart += 2;
    }

    const payload = buffer.subarray(payloadStart);
    return {
      topic,
      payload,
      dup,
      retain,
      qos,
      messageId: id
    };
  }
};

export function decodeLength(
  buffer: Uint8Array,
  startIndex: number
): { length: number; bytesUsedToEncodeLength: number } {
  let i = startIndex;
  let encodedByte = 0;
  let value = 0;
  let multiplier = 1;

  do {
    encodedByte = buffer[i];
    i += 1;
    value += (encodedByte & 127) * multiplier;
    if (multiplier > 128 * 128 * 128) {
      throw new Error("malformed length");
    }
    multiplier *= 128;
  } while ((encodedByte & 128) !== 0);

  return { length: value, bytesUsedToEncodeLength: i - startIndex };
}

export function parseMessageId(buffer: Uint8Array, startIndex: number): number {
  if (startIndex + 2 > buffer.length) {
    throw new Error("Cannot parse messageId");
  }

  return (buffer[startIndex] << 8) | buffer[startIndex + 1];
}

export function decodeUint8Array(buffer: Uint8Array, startIndex: number): Uint8Array | undefined {
  if (startIndex >= buffer.length || startIndex + 2 > buffer.length) {
    return void 0;
  }

  const length = (buffer[startIndex] << 8) + buffer[startIndex + 1];
  const bytes = buffer.subarray(startIndex + 2, startIndex + 2 + length);
  return bytes;
}
