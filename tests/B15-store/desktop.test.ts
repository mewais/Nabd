import { boot } from "./harness";

describe("the desktop", () => {
  it("quits and sends a test notification through the backend", async () => {
    const app = await boot();
    app.get().sendTestNotification();
    app.get().quit();
    expect(app.client.sendTestNotification).toHaveBeenCalledTimes(1);
    expect(app.client.quit).toHaveBeenCalledTimes(1);
  });

  it("a notification that cannot be sent becomes the app notice", async () => {
    const app = await boot();
    vi.mocked(app.client.sendTestNotification).mockRejectedValueOnce(new Error("no daemon"));
    app.get().sendTestNotification();
    await vi.waitFor(() =>
      expect(app.get().appNotice).toEqual({
        kind: "error",
        text: "Could not send a notification: no daemon",
      }),
    );
  });
});
