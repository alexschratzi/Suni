import {Link, Stack} from 'expo-router';
import {StyleSheet} from 'react-native';
import {Text} from "react-native-paper";

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{title: 'Oops!'}}/>
            <Text>This screen does not exist.</Text>
            <Link href="/" style={styles.link}>
                <Text>Go to home screen!</Text>
            </Link>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});
