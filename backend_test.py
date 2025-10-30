import requests
import sys
import json
from datetime import datetime

class BusBookingAPITester:
    def __init__(self, base_url="https://voyage-hub-28.preview.emergentagent.com"):
        self.base_url = base_url
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"testuser{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.user_token = response['token']
            return test_user_data
        return None

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@busgo.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_data
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_user_login(self, user_data):
        """Test user login"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.user_token = response['token']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user"""
        if not self.user_token:
            self.log_test("Get Current User", False, "No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, _ = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        return success

    def test_bus_search(self):
        """Test bus search"""
        success, response = self.run_test(
            "Bus Search (All)",
            "GET",
            "buses/search",
            200
        )
        
        if success:
            # Test search with parameters
            success2, _ = self.run_test(
                "Bus Search (With Params)",
                "GET",
                "buses/search?route_from=New York&route_to=Boston",
                200
            )
            return success and success2
        return False

    def test_admin_create_bus(self):
        """Test admin create bus"""
        if not self.admin_token:
            self.log_test("Admin Create Bus", False, "No admin token available")
            return None
            
        bus_data = {
            "bus_number": f"TEST{datetime.now().strftime('%H%M%S')}",
            "route_from": "Test City A",
            "route_to": "Test City B",
            "departure_time": "09:00",
            "arrival_time": "15:00",
            "total_seats": 40,
            "price": 25.50,
            "bus_type": "AC",
            "amenities": ["WiFi", "Charging Port"]
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, response = self.run_test(
            "Admin Create Bus",
            "POST",
            "admin/buses",
            200,
            data=bus_data,
            headers=headers
        )
        
        return response.get('id') if success else None

    def test_get_bus_details(self, bus_id):
        """Test get bus details"""
        if not bus_id:
            self.log_test("Get Bus Details", False, "No bus ID available")
            return False
            
        success, _ = self.run_test(
            "Get Bus Details",
            "GET",
            f"buses/{bus_id}",
            200
        )
        return success

    def test_create_booking(self, bus_id):
        """Test create booking"""
        if not self.user_token or not bus_id:
            self.log_test("Create Booking", False, "Missing user token or bus ID")
            return None
            
        booking_data = {
            "bus_id": bus_id,
            "seats": [1, 2],
            "passenger_name": "Test Passenger",
            "passenger_email": "passenger@test.com",
            "passenger_phone": "+1234567890"
        }
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data=booking_data,
            headers=headers
        )
        
        return response.get('id') if success else None

    def test_get_user_bookings(self):
        """Test get user bookings"""
        if not self.user_token:
            self.log_test("Get User Bookings", False, "No user token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, _ = self.run_test(
            "Get User Bookings",
            "GET",
            "bookings",
            200,
            headers=headers
        )
        return success

    def test_create_payment_session(self, booking_id):
        """Test create payment session"""
        if not self.user_token or not booking_id:
            self.log_test("Create Payment Session", False, "Missing user token or booking ID")
            return None
            
        payment_data = {
            "booking_id": booking_id,
            "host_url": "https://voyage-hub-28.preview.emergentagent.com"
        }
        
        headers = {'Authorization': f'Bearer {self.user_token}'}
        success, response = self.run_test(
            "Create Payment Session",
            "POST",
            "payments/create-session",
            200,
            data=payment_data,
            headers=headers
        )
        
        return response.get('session_id') if success else None

    def test_admin_analytics(self):
        """Test admin analytics"""
        if not self.admin_token:
            self.log_test("Admin Analytics", False, "No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Analytics",
            "GET",
            "admin/analytics",
            200,
            headers=headers
        )
        return success

    def test_admin_get_all_buses(self):
        """Test admin get all buses"""
        if not self.admin_token:
            self.log_test("Admin Get All Buses", False, "No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Get All Buses",
            "GET",
            "admin/buses",
            200,
            headers=headers
        )
        return success

    def test_admin_get_all_bookings(self):
        """Test admin get all bookings"""
        if not self.admin_token:
            self.log_test("Admin Get All Bookings", False, "No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Get All Bookings",
            "GET",
            "admin/bookings",
            200,
            headers=headers
        )
        return success

    def test_admin_get_all_users(self):
        """Test admin get all users"""
        if not self.admin_token:
            self.log_test("Admin Get All Users", False, "No admin token available")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Get All Users",
            "GET",
            "admin/users",
            200,
            headers=headers
        )
        return success

    def test_admin_update_bus(self, bus_id):
        """Test admin update bus"""
        if not self.admin_token or not bus_id:
            self.log_test("Admin Update Bus", False, "Missing admin token or bus ID")
            return False
            
        update_data = {
            "bus_number": f"UPDATED{datetime.now().strftime('%H%M%S')}",
            "route_from": "Updated City A",
            "route_to": "Updated City B",
            "departure_time": "10:00",
            "arrival_time": "16:00",
            "total_seats": 45,
            "price": 30.00,
            "bus_type": "Sleeper",
            "amenities": ["WiFi", "Charging Port", "Blanket"]
        }
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Update Bus",
            "PUT",
            f"admin/buses/{bus_id}",
            200,
            data=update_data,
            headers=headers
        )
        return success

    def test_admin_delete_bus(self, bus_id):
        """Test admin delete bus"""
        if not self.admin_token or not bus_id:
            self.log_test("Admin Delete Bus", False, "Missing admin token or bus ID")
            return False
            
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        success, _ = self.run_test(
            "Admin Delete Bus",
            "DELETE",
            f"admin/buses/{bus_id}",
            200,
            headers=headers
        )
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Bus Booking API Tests...")
        print("=" * 50)
        
        # Test user registration and login
        user_data = self.test_user_registration()
        if not user_data:
            print("❌ User registration failed, stopping user tests")
            return False
            
        self.test_user_login(user_data)
        self.test_get_current_user()
        
        # Test admin login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping admin tests")
            return False
        
        # Test bus operations
        self.test_bus_search()
        
        # Test admin bus operations
        bus_id = self.test_admin_create_bus()
        if bus_id:
            self.test_get_bus_details(bus_id)
            self.test_admin_update_bus(bus_id)
            
            # Test booking operations
            booking_id = self.test_create_booking(bus_id)
            if booking_id:
                self.test_get_user_bookings()
                self.test_create_payment_session(booking_id)
            
            # Clean up - delete test bus
            self.test_admin_delete_bus(bus_id)
        
        # Test admin analytics and data retrieval
        self.test_admin_analytics()
        self.test_admin_get_all_buses()
        self.test_admin_get_all_bookings()
        self.test_admin_get_all_users()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = BusBookingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())