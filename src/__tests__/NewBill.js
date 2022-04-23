/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { ROUTES } from "../constants/routes";

import { localStorageMock } from "../__mocks__/localStorage";
import mockStore from "../__mocks__/store";

import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    let onNavigate;
    let container;
    beforeEach(() => {
      document.body.innerHTML = NewBillUI();
      onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

      container = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });
    });

    test("Then I should see the new bill form", () => {
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    describe("When I add a file in the fee input", () => {
      test("Then only files with .png, .jpg and .jpeg should be accepted", async () => {
        const errMessage = screen.getByTestId("file-input-error-message");
        const fileInput = screen.getByTestId("file");
        const handleChangeFile = jest.fn(container.handleChangeFile);
        fileInput.addEventListener("change", handleChangeFile);

        const fakeFiles = [
          new File(["uWu"], "fakeFile.png", { type: "image/png" }),
          new File(["uWu"], "fakeFile.jpg", { type: "image/jpg" }),
          new File(["uWu"], "fakeFile.jpeg", {
            type: "image/jpeg",
          }),
        ];

        // For jpg, jpeg, and png files
        fakeFiles.forEach((file) => {
          fireEvent.change(fileInput, { target: { files: [file] } });
          userEvent.upload(fileInput, file);
          expect(handleChangeFile).toHaveBeenCalled();
          expect(fileInput.files[0]).toStrictEqual(file);
          expect(errMessage.classList[1]).toEqual("hide");
        });

        // For wrong file type
        const wrongFakeFile = new File(["uWu"], "fakeFile.gif", {
          type: "image/gif",
        });
        fireEvent.change(fileInput, {
          target: { files: [wrongFakeFile] },
        });
        userEvent.upload(fileInput, wrongFakeFile);
        expect(handleChangeFile).toHaveBeenCalled();
        expect(fileInput.files[0]).toStrictEqual(wrongFakeFile);
        expect(errMessage.classList.length).toEqual(1);
        expect(
          screen.getByText(
            "Ce fichier n'est pas supporté, veuillez choisir un fichier jpeg, jpg, ou png."
          )
        ).toBeTruthy();
      });
    });

    describe("When I click on submit button", () => {
      test("Then the billsUI page should loaded", () => {
        const newBillForm = screen.getByTestId("form-new-bill");

        const handleSubmit = jest.fn(container.handleSubmit);
        newBillForm.addEventListener("submit", handleSubmit);
        fireEvent.submit(newBillForm);

        expect(handleSubmit).toHaveBeenCalled();
        expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
      });
    });

    // Test d'integration NewBill POST.
    const testBill = {
      id: "njl52ho4oj98jnklA24bk",
      status: "refused",
      pct: 20,
      amount: 200,
      email: "a@a",
      name: "test-test",
      vat: "25",
      fileName: "preview-facture-free-201801-pdf-1.jpg",
      date: "2022-02-02",
      commentAdmin: "facture de test",
      commentary: "Ceci est un superbe test",
      type: "fast-food",
      fileUrl:
        "https://test.storage.tld/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=4df6ed2c-12c8-42a2-b013-346c1346f732",
    };

    describe("When I submit a new bill", () => {
      test("Then the newBill should be posted", async () => {
        const spy = jest.spyOn(mockStore, "bills");
        const response = await mockStore.bills().create(testBill);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(response.length).toBe(5);
        expect(response.pop().id).toBe(testBill.id);
      });

      describe("When the API call fails with a 404 error message", () => {
        test("Then a 404 error message should be displayed", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              update: () => {
                return Promise.reject(new Error("Erreur 404"));
              },
            };
          });

          let response;
          try {
            response = await mockStore.bills().update(testBill);
          } catch (err) {
            response = err;
          }

          document.body.innerHTML = BillsUI({ error: response });
          const message = screen.getByText(/Erreur 404/);
          expect(message).toBeTruthy();
        });
      });

      describe("When the API call fails with a 500 error message", () => {
        test("Then a 500 error message should be displayed", async () => {
          mockStore.bills.mockImplementationOnce(() => {
            return {
              update: () => {
                return Promise.reject(new Error("Erreur 500"));
              },
            };
          });

          let response;
          try {
            response = await mockStore.bills().update(testBill);
          } catch (err) {
            response = err;
          }

          document.body.innerHTML = BillsUI({ error: response });
          const message = screen.getByText(/Erreur 500/);
          expect(message).toBeTruthy();
        });
      });
    });
  });
});
