import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanBarcode, X, FlashlightOff, Flashlight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.permissionContainer}>
          <ScanBarcode size={80} color={Colors.primary.blue} strokeWidth={1.5} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            To scan product barcodes and get instant health scores, we need access to your camera.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    console.log('Barcode scanned:', data);
    setIsScanning(false);
    router.push(`/product?code=${data}`);
  };

  if (isScanning) {
    return (
      <View style={styles.scannerContainer}>
        <StatusBar barStyle="light-content" />
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'qr',
            ],
          }}
          enableTorch={torchEnabled}
        >
          <View style={[styles.cameraOverlay, { paddingTop: insets.top }]}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsScanning(false)}
              >
                <X size={28} color={Colors.neutral.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.torchButton}
                onPress={() => setTorchEnabled(!torchEnabled)}
              >
                {torchEnabled ? (
                  <Flashlight size={24} color={Colors.neutral.white} />
                ) : (
                  <FlashlightOff size={24} color={Colors.neutral.white} />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.scannerFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>

            <View style={styles.instructionContainer}>
              <Text style={styles.instructionText}>
                Position the barcode within the frame
              </Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Product</Text>
          <Text style={styles.subtitle}>
            Scan any food product barcode to get instant health insights
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <ScanBarcode size={120} color={Colors.primary.blue} strokeWidth={1.5} />
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: Colors.health.excellent }]} />
            <Text style={styles.featureText}>Health Score Analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: Colors.accent.blue }]} />
            <Text style={styles.featureText}>Detailed Nutrition Info</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureDot, { backgroundColor: Colors.accent.purple }]} />
            <Text style={styles.featureText}>Diet Compatibility Check</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => setIsScanning(true)}
        >
          <ScanBarcode size={24} color={Colors.neutral.white} strokeWidth={2} />
          <Text style={styles.scanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primary.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresContainer: {
    marginBottom: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text.secondary,
  },
  scanButton: {
    backgroundColor: Colors.primary.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  scanButtonText: {
    color: Colors.neutral.white,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: Colors.neutral.black,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  torchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.neutral.white,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: '30%',
    right: '15%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.neutral.white,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: '30%',
    left: '15%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.neutral.white,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: '30%',
    right: '15%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.neutral.white,
    borderBottomRightRadius: 8,
  },
  instructionContainer: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  instructionText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '500' as const,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
});
