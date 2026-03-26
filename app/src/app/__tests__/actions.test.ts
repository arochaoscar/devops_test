import { getGreetings, createGreeting } from "../actions";

// --- Mocks ---

const mockFindMany = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    greeting: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

const mockVerifyRecaptcha = jest.fn();
jest.mock("@/lib/recaptcha", () => ({
  verifyRecaptcha: (...args: unknown[]) => mockVerifyRecaptcha(...args),
}));

const mockHeadersGet = jest.fn();
jest.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// --- Tests ---

describe("getGreetings", () => {
  beforeEach(() => jest.resetAllMocks());

  it("should return greetings ordered by createdAt desc", async () => {
    const mockData = [
      { name: "Alice", createdAt: new Date(), ipAddress: "1.2.3.4", location: "NYC" },
      { name: "Bob", createdAt: new Date(), ipAddress: "5.6.7.8", location: null },
    ];
    mockFindMany.mockResolvedValue(mockData);

    const result = await getGreetings();

    expect(result).toEqual(mockData);
    expect(mockFindMany).toHaveBeenCalledWith({
      select: { name: true, createdAt: true, ipAddress: true, location: true },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("createGreeting", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockVerifyRecaptcha.mockResolvedValue(true);
    mockHeadersGet.mockReturnValue(null);
    mockCreate.mockResolvedValue({});
    mockFindMany.mockResolvedValue([]);
  });

  // --- Validation ---

  it("should return error when name is empty", async () => {
    const result = await createGreeting("", null);
    expect(result).toEqual({ error: "Name is required", greetings: [] });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should return error when name is only whitespace", async () => {
    const result = await createGreeting("   ", null);
    expect(result).toEqual({ error: "Name is required", greetings: [] });
  });

  it("should return error when name exceeds 255 characters", async () => {
    const longName = "a".repeat(256);
    const result = await createGreeting(longName, null);
    expect(result).toEqual({ error: "Name is too long", greetings: [] });
  });

  it("should accept name with exactly 255 characters", async () => {
    const name = "a".repeat(255);
    const result = await createGreeting(name, null);
    expect(result.error).toBeUndefined();
    expect(mockCreate).toHaveBeenCalled();
  });

  // --- reCAPTCHA ---

  it("should return error when reCAPTCHA fails", async () => {
    mockVerifyRecaptcha.mockResolvedValue(false);

    const result = await createGreeting("Alice", "bad-token");
    expect(result).toEqual({ error: "reCAPTCHA verification failed", greetings: [] });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- IP extraction ---

  it("should extract IP from x-forwarded-for header", async () => {
    mockHeadersGet.mockReturnValue("8.8.8.8, 10.0.0.1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ city: "Mountain View", regionName: "California", country: "US" }),
    });

    await createGreeting("Alice", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Alice",
        ipAddress: "8.8.8.8",
        location: "Mountain View, California, US",
      },
    });
  });

  it("should default to 0.0.0.0 when no forwarded header", async () => {
    mockHeadersGet.mockReturnValue(null);

    await createGreeting("Bob", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Bob",
        ipAddress: "0.0.0.0",
        location: "Local Network",
      },
    });
  });

  // --- Local IP detection ---

  it.each([
    ["127.0.0.1", "127.0.0.1"],
    ["10.0.0.5", "10.0.0.5"],
    ["172.16.0.1", "172.16.0.1"],
    ["192.168.1.1", "192.168.1.1"],
    ["169.254.0.1", "169.254.0.1"],
    ["::ffff:127.0.0.1", "::ffff:127.0.0.1"],
    ["::1", "::1"],
  ])("should detect %s as local IP", async (ip) => {
    mockHeadersGet.mockReturnValue(ip);

    await createGreeting("Test", null);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: "Local Network" }),
      })
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // --- Geolocation ---

  it("should build location from geo API response", async () => {
    mockHeadersGet.mockReturnValue("200.50.10.1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ city: "Bogota", regionName: "Cundinamarca", country: "Colombia" }),
    });

    await createGreeting("Carlos", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Carlos",
        ipAddress: "200.50.10.1",
        location: "Bogota, Cundinamarca, Colombia",
      },
    });
  });

  it("should set location to null when geo API fails", async () => {
    mockHeadersGet.mockReturnValue("200.50.10.1");
    mockFetch.mockRejectedValue(new Error("Network error"));

    await createGreeting("Carlos", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ location: null }),
    });
  });

  it("should set location to null when geo API returns no city", async () => {
    mockHeadersGet.mockReturnValue("200.50.10.1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ city: "", regionName: "", country: "" }),
    });

    await createGreeting("Carlos", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ location: null }),
    });
  });

  it("should set location to null when geo API returns non-ok", async () => {
    mockHeadersGet.mockReturnValue("200.50.10.1");
    mockFetch.mockResolvedValue({ ok: false });

    await createGreeting("Carlos", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ location: null }),
    });
  });

  // --- Successful creation ---

  it("should return greetings list after successful creation", async () => {
    const greetings = [{ name: "Alice", createdAt: new Date(), ipAddress: "0.0.0.0", location: "Local Network" }];
    mockFindMany.mockResolvedValue(greetings);

    const result = await createGreeting("Alice", null);

    expect(result).toEqual({ greetings });
    expect(result.error).toBeUndefined();
  });

  it("should trim name before storing", async () => {
    await createGreeting("  Alice  ", null);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Alice" }),
    });
  });
});
