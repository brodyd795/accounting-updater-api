import { update } from "../src/update.js";
import {getEmails} from '../src/gmail-service.js';

jest.mock('../src/gmail-service.js');

describe('index', () => {
    test('should get emails', () => {
        update();
    
        expect(getEmails).toHaveBeenCalledTimes(1);
    });
});
