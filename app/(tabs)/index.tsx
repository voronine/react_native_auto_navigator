import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Button, Dimensions, TouchableOpacity, Modal, FlatList } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import GOOGLE_MAPS_KEY from '../../env';
import PolylineDecoder from '@mapbox/polyline';
import { Loader } from '@/components/Loader';
import { Ionicons } from '@expo/vector-icons';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Route {
  distance: string;
  duration: string;
  midpoint: Coordinate;
  overview_polyline: {
    points: string;
  };
}

export default function App() {
  const [origin, setOrigin] = useState<Coordinate | null>(null);
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [movedToCurrentLocation, setMovedToCurrentLocation] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    getLocationPermission();
  }, []);

  const getLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Доступ заборонено');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    const current: Coordinate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    setOrigin(current);
    moveToRegion(current);
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setDestination(coordinate);
  };

  const moveToRegion = (coordinates: Coordinate) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...coordinates,
        latitudeDelta: 0.09,
        longitudeDelta: 0.04,
      }, 1000);
      setMovedToCurrentLocation(true);
    }
  };

  const fetchRoutes = async () => {
    if (origin && destination) {
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_KEY}&alternatives=true`);
        const data = await response.json();
        if (data.routes) {
          const routesData: Route[] = data.routes.map((route: any) => {
            const { distance, duration, steps } = route.legs[0];
            const points = decodePolyline(route.overview_polyline.points);
            const midpoint = calculateMidpoint(points);
            return {
              ...route,
              distance: distance.text,
              duration: duration.text,
              midpoint,
              steps: steps.map((step: any) => step.html_instructions),
            };
          });
          setRoutes(routesData.slice(0, 2));
        }
      } catch (error) {
        console.error("Помилка при отриманні маршрутів:", error);
      }
    }
  };

  useEffect(() => {
    if (origin && destination) {
      fetchRoutes();
    }
  }, [origin, destination]);

  const decodePolyline = (encoded: string): Coordinate[] => {
    const points = PolylineDecoder.decode(encoded);
    return points.map((point: number[]) => ({
      latitude: point[0],
      longitude: point[1],
    }));
  };

  const calculateMidpoint = (points: Coordinate[]): Coordinate => {
    const total = points.length;
    const midpointIndex = Math.floor(total / 2);
    return points[midpointIndex];
  };

  useEffect(() => {
    let locationSubscription: any | null = null;
    if (navigating) {
      locationSubscription = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const currentCoordinates: Coordinate = {
            latitude,
            longitude,
          };

          if (mapRef.current) {
            const heading = calculateHeading(origin!, destination!);

            mapRef.current.animateCamera({
              center: currentCoordinates,
              heading,
              pitch: 45,
              zoom: 18,
            }, { duration: 1000 });
          }
        }
      );
    } else {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    }
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [navigating]);

  const calculateHeading = (origin: Coordinate, destination: Coordinate): number => {
    const startLat = origin.latitude * Math.PI / 180;
    const startLon = origin.longitude * Math.PI / 180;
    const endLat = destination.latitude * Math.PI / 180;
    const endLon = destination.longitude * Math.PI / 180;

    const dLon = endLon - startLon;
    const y = Math.sin(dLon) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    brng = brng * (180 / Math.PI);
    brng = (brng + 360) % 360;
    return brng;
  };

  if (!origin) {
    return (
      <View style={styles.container}>
        <Loader />
        {errorMsg && <Text>{errorMsg}</Text>}
      </View>
    );
  }

  const renderRouteOption = ({ item }: { item: Route }) => (
    <TouchableOpacity
      style={styles.routeOption}
      onPress={() => {
        setSelectedRoute(item);
        setRoutes([item]);
        setModalVisible(false);
      }}
    >
      <Text style={styles.routeText}>Довжина: {item.distance}</Text>
      <Text style={styles.routeText}>Час: {item.duration}</Text>
    </TouchableOpacity>
  );

  const activateDriveMode = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Доступ заборонено');
      return;
    }

    try {
      if (!origin) {
        setErrorMsg('Місце відправлення не встановлено');
        return;
      }

      const region = {
        latitude: origin.latitude,
        longitude: origin.longitude,
        radius: 100,
      };

      await Location.startGeofencingAsync('navigation', [region]);
      setNavigating(true);
      console.log('Режим руху активовано');
    } catch (error) {
      console.error('Помилка активації режиму руху:', error);
      setErrorMsg('Помилка активації режиму руху');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          placeholder="Введіть адресу відправлення"
          fetchDetails={true}
          onPress={(data, details = null) => {
            if (details) {
              const coordinates: Coordinate = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              };
              setOrigin(coordinates);
              moveToRegion(coordinates);
            }
          }}
          query={{
            key: GOOGLE_MAPS_KEY,
            language: 'uk',
          }}
          styles={{
            textInput: styles.input,
            container: styles.autocompleteContainer,
            listView: styles.listView,
          }}
        />
        <GooglePlacesAutocomplete
          placeholder="Введіть адресу призначення"
          fetchDetails={true}
          onPress={(data, details = null) => {
            if (details) {
              const coordinates: Coordinate = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
              };
              setDestination(coordinates);
              moveToRegion(coordinates);
            }
          }}
          query={{
            key: GOOGLE_MAPS_KEY,
            language: 'uk',
          }}
          styles={{
            textInput: styles.input,
            container: styles.autocompleteContainer,
            listView: styles.listView,
          }}
        />
      </View>
      {routes.length > 1 && (
        <TouchableOpacity style={styles.selectRouteButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.selectRouteText}>Обрати маршрут</Text>
        </TouchableOpacity>
      )}
      {selectedRoute && (
        <TouchableOpacity style={styles.startNavigationButton} onPress={activateDriveMode}>
          <Text style={styles.startNavigationText}>Почати навігацію</Text>
        </TouchableOpacity>
      )}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: origin.latitude,
          longitude: origin.longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.04,
        }}
        onPress={handleMapPress}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={false}
        pitchEnabled={true}
        rotateEnabled={true}
        zoomEnabled={true}
      >
        {origin && (
          <Marker
            coordinate={origin}
            title="Моє місцезнаходження"
            pinColor="blue"
          />
        )}
        {destination && (
          <Marker
            coordinate={destination}
            title="Пункт призначення"
            pinColor="red"
          />
        )}
        {routes.map((route, index) => (
          <React.Fragment key={index}>
            <Polyline
              coordinates={decodePolyline(route.overview_polyline.points)}
              strokeColor={index === 0 ? 'black' : 'red'}
              strokeWidth={3}
            />
            <Marker
              coordinate={route.midpoint}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{route.distance}</Text>
                <Text style={styles.infoText}>{route.duration}</Text>
              </View>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Виберіть маршрут</Text>
            <FlatList
              data={routes}
              renderItem={renderRouteOption}
              keyExtractor={(item, index) => index.toString()}
            />
            <Button title="Закрити" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={() => {
          if (origin) {
            moveToRegion(origin);
          }
        }}
      >
        <Ionicons name="navigate-outline" size={24} color="white" style={styles.icon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontSize: 10,
  },
  searchContainer: {
    position: 'absolute',
    top: 50,
    width: '90%',
    zIndex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 5,
  },
  autocompleteContainer: {
    flex: 0,
    position: 'relative',
    width: '100%',
  },
  listView: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 5,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  infoText: {
    fontSize: 9,
  },
  selectRouteButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 35,
    zIndex: 99,
  },
  selectRouteText: {
    color: 'white',
    fontWeight: 'bold',
  },
  startNavigationButton: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    zIndex: 99,
  },
  startNavigationText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  routeOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  routeText: {
    fontSize: 16,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: 190,
    left: 320,
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    zIndex: 98,
    width: 25,
    height: 40,
    borderBottomEndRadius: 35,
    borderTopRightRadius: 35,
    borderBottomStartRadius: 35,
    borderTopLeftRadius: 35,
  },
  icon: {
    zIndex: 199
  }
});
