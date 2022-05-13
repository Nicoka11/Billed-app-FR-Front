/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import { toHaveClass } from "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { formatDate, formatStatus } from "../app/format.js";
import { ROUTES } from "../constants/routes.js";

import router from "../app/Router.js";
import Bills from "../containers/Bills";

const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
};

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    beforeEach(() => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      document.body.innerHTML = BillsUI({ data: bills });
    });
    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      //to-do write expect expression
      expect(windowIcon).toHaveClass("active-icon");
    });
    test("Then bills should be ordered from earliest to latest", () => {
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });
  describe("When I click on the NewBill button", () => {
    test("Then the new bill form page should be rendered", () => {
      const billsContainer = new Bills({
        document,
        onNavigate,
        localStorage: window.localStorage,
      });
      const handleClickNewBillMethod = jest.fn(
        billsContainer.handleClickNewBill
      );
      const buttonNewBill = screen.getByTestId("btn-new-bill");
      handleClickNewBillMethod(buttonNewBill);
      userEvent.click(buttonNewBill);

      expect(handleClickNewBillMethod).toHaveBeenCalled();
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });

    test("Then should change icon1 & icon2 className navigating to NewBill", () => {
      window.onNavigate(ROUTES_PATH.NewBill);
      const icon1 = screen.getByTestId("icon-window");
      const icon2 = screen.getByTestId("icon-mail");

      expect(icon1).not.toHaveClass("active-icon");
      expect(icon2).toHaveClass("active-icon");
    });
  });

  // Test d'integration GET Bills
  describe("GET integration tests", () => {
    test("fetches bills from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      document.body.innerHTML = BillsUI({ data: bills });
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      await waitFor(() => screen.getByText("Mes notes de frais"));
      const displayedBills = screen.getAllByTestId("icon-eye");
      expect(displayedBills).toBeTruthy();
    });
    test("Then it should display bills with date & status", async () => {
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
      const spyGetList = jest.spyOn(billsContainer, "getBills");
      const data = await billsContainer.getBills();
      const mockBills = await mockStore.bills().list();
      const mockDate = mockBills[0].date;
      const mockStatus = mockBills[0].status;

      expect(spyGetList).toHaveBeenCalledTimes(1);
      expect(data[0].date).toEqual(formatDate(mockDate));
      expect(data[0].status).toEqual(formatStatus(mockStatus));
    });

    test('Then if the store is corrupted,it should console.log(error) & return {date: "nicolas", status: undefined}', async () => {
      const corruptedStore = {
        bills() {
          return {
            list() {
              return Promise.resolve([
                {
                  id: "29047s289f6784pg",
                  vat: "40",
                  date: "nicolas",
                  status: "dope",
                },
              ]);
            },
          };
        },
      };
      const billsContainer = new Bills({
        document,
        onNavigate: window.onNavigate,
        store: corruptedStore,
        localStorage: window.localStorage,
      });
      const spyConsoleLog = jest.spyOn(console, "log");
      const data = await billsContainer.getBills();

      expect(spyConsoleLog).toHaveBeenCalled();
      expect(data[0].date).toEqual("nicolas");
      expect(data[0].status).toEqual(undefined);
    });
  });
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    test("Then the bills should be fetched from mockStore API", async () => {
      const spy = jest.spyOn(mockStore, "bills");
      const bills = await mockStore.bills().list();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(bills.length).toBe(4);
    });

    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      let response;
      try {
        response = await mockStore.bills().list();
      } catch (err) {
        response = err;
      }

      document.body.innerHTML = BillsUI({ error: response });
      const message = screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      let response;
      try {
        response = await mockStore.bills().list();
      } catch (err) {
        response = err;
      }

      document.body.innerHTML = BillsUI({ error: response });
      const message = screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
